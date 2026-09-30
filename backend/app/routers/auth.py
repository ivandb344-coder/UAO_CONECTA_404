"""Autenticación de UAO Conecta.

- Correo/contraseña: hash Bcrypt (passlib) + JWT propio (``Authorization: Bearer <token>``).
- Google: Emergent Auth. El navegador pasa por ``GET /api/auth/google/login`` → Emergent/Google →
  vuelve al frontend con ``#session_id=...`` → el frontend canjea ese ``session_id`` en
  ``POST /api/auth/google`` y recibe el mismo JWT que en el login tradicional.

Contrato de respuesta de login/registro/google: ``{"token": str, "user": {...public_user}}``.
"""
import hashlib
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from typing import Optional
from urllib.parse import quote, urlparse

import aiosmtplib
import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

from app.core.config import (
    CORS_ORIGINS,
    DEFAULT_ACCESSIBILITY,
    EMAIL_TAKEN_MESSAGE,
    FRONTEND_URL,
    PROGRAM_NAMES,
    ROLES,
    db,
    pwd,
)
from app.core.security import current_user, token
from app.models.schemas import GoogleAuth, Login, Register
from app.services.users import _profile_completed, public_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# Emergent Auth (Google). La pantalla de inicio es auth.emergentagent.com; el canje del
# session_id se hace SIEMPRE desde el backend contra /session-data.
EMERGENT_AUTH_LOGIN_URL = (os.getenv("EMERGENT_AUTH_URL") or "https://auth.emergentagent.com/").strip()
EMERGENT_SESSION_DATA_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

MIN_PASSWORD_LENGTH = 6
MIN_RESET_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72  # Límite propio del algoritmo bcrypt


# ============================================================
# MODELOS
# ============================================================

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


# ============================================================
# UTILIDADES
# ============================================================

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _password_error(password: str, minimum: int) -> Optional[str]:
    if len(password or "") < minimum:
        return f"La contraseña debe tener al menos {minimum} caracteres."
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        return "La contraseña es demasiado larga (máximo 72 caracteres)."
    return None


def hash_password(password: str) -> str:
    return pwd.hash(password)


def verify_password(password: str, hashed: Optional[str]) -> bool:
    """Nunca lanza excepción: hashes vacíos, corruptos o desconocidos se consideran inválidos."""
    if not password or not hashed:
        return False
    try:
        return pwd.verify(password, hashed)
    except (ValueError, TypeError) as exc:
        logger.warning("No se pudo verificar un hash de contraseña: %s", exc)
        return False


async def _ensure_user_id(user: dict) -> dict:
    """Usuarios heredados (creados sin el UUID ``id``) reciben uno la primera vez que ingresan."""
    if user.get("id"):
        return user
    new_id = str(uuid.uuid4())
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"id": new_id}})
    user["id"] = new_id
    logger.info("Usuario heredado migrado a id UUID: %s", user.get("email"))
    return user


def _session_payload(user: dict) -> dict:
    return {"token": token(user), "user": public_user(user)}


def _allowed_redirect_origins() -> set:
    origins = {o.rstrip("/") for o in CORS_ORIGINS}
    parsed = urlparse(FRONTEND_URL)
    origins.add(f"{parsed.scheme}://{parsed.netloc}")
    return origins


def _safe_redirect(redirect: Optional[str]) -> str:
    """Solo se permiten destinos http(s) cuyo origen esté autorizado (CORS / FRONTEND_URL).

    Se elimina cualquier fragmento (#...) porque Emergent Auth devuelve ``#session_id=...``.
    """
    value = (redirect or "").strip()
    if value:
        parsed = urlparse(value)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if parsed.scheme in {"http", "https"} and parsed.netloc and origin in _allowed_redirect_origins():
            return value.split("#", 1)[0]
        logger.warning("Redirect de Google no autorizado, se usa FRONTEND_URL: %s", value)
    return f"{FRONTEND_URL.split('#', 1)[0].rstrip('/')}/"


def _reset_link(raw_token: str) -> str:
    # El frontend usa HashRouter (GitHub Pages no tiene fallback SPA): /#/ruta?query
    base = FRONTEND_URL.split("#", 1)[0].rstrip("/")
    return f"{base}/#/restablecer-contrasena?token={raw_token}"


def _hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _as_aware(value) -> Optional[datetime]:
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value)
        except ValueError:
            return None
    if not isinstance(value, datetime):
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _smtp_settings() -> dict:
    user = (os.getenv("SMTP_USER") or "").strip()
    return {
        "host": (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip(),
        "port": int(os.getenv("SMTP_PORT") or "587"),
        "user": user,
        "password": (os.getenv("SMTP_PASSWORD") or "").strip(),
        "sender": (os.getenv("SMTP_FROM") or user).strip(),
    }


def _smtp_configured() -> bool:
    cfg = _smtp_settings()
    return bool(cfg["user"] and cfg["password"])


async def _send_reset_email(to_email: str, reset_url: str, user_name: str, minutes: int) -> None:
    """Envío asíncrono (aiosmtplib) en segundo plano para no bloquear la respuesta."""
    cfg = _smtp_settings()
    safe_name = escape(user_name or "usuario")
    safe_url = escape(reset_url, quote=True)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Restablece tu contraseña · UAO Conecta"
    msg["From"] = cfg["sender"]
    msg["To"] = to_email

    text = (
        f"Hola, {user_name or 'usuario'}.\n\n"
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta de UAO Conecta.\n\n"
        f"Crea una nueva contraseña aquí:\n{reset_url}\n\n"
        f"El enlace es válido durante {minutes} minutos y solo puede usarse una vez.\n"
        "Si no solicitaste este cambio, ignora este correo.\n\nUAO Conecta"
    )
    html = f"""<!DOCTYPE html><html lang="es"><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:18px;border:1px solid #e5e7eb;overflow:hidden">
<tr><td style="background:#111827;padding:28px;text-align:center;color:#fff;font-size:26px;font-weight:700">UAO <span style="color:#d1d5db;font-weight:500">Conecta</span></td></tr>
<tr><td style="padding:32px">
<p style="font-size:16px">Hola, <strong>{safe_name}</strong>.</p>
<p style="font-size:15px;line-height:1.6">Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
<p style="text-align:center;margin:28px 0"><a href="{safe_url}" style="background:#0f766e;color:#fff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:700">Restablecer mi contraseña</a></p>
<p style="font-size:13px;color:#6b7280;line-height:1.6">El enlace es válido durante {minutes} minutos y solo puede usarse una vez. Si no solicitaste este cambio, ignora este correo.</p>
<p style="font-size:12px;color:#9ca3af;word-break:break-all">{safe_url}</p>
</td></tr></table></td></tr></table></body></html>"""

    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    implicit_tls = cfg["port"] == 465
    try:
        await aiosmtplib.send(
            msg,
            hostname=cfg["host"],
            port=cfg["port"],
            username=cfg["user"],
            password=cfg["password"],
            use_tls=implicit_tls,
            start_tls=not implicit_tls,
            timeout=20,
        )
        logger.info("Correo de recuperación enviado a %s", to_email)
    except Exception as exc:  # El usuario ya recibió la respuesta genérica
        logger.error("Error enviando correo de recuperación a %s: %s", to_email, exc)


# ============================================================
# VALIDACIÓN DE CORREO
# ============================================================

@router.get("/email-available")
async def email_available(email: str = ""):
    value = (email or "").strip().lower()
    if not value or "@" not in value:
        return {"available": False, "reason": "Escribe un correo electrónico válido."}
    if await db.users.find_one({"email": value}, {"_id": 0, "id": 1}):
        return {"available": False, "reason": EMAIL_TAKEN_MESSAGE}
    return {"available": True}


# ============================================================
# REGISTRO / LOGIN / SESIÓN
# ============================================================

@router.post("/register")
async def register(data: Register):
    errors = {}
    name = (data.name or "").strip()
    username = (data.username or "").strip().lower()
    email = data.email.strip().lower()

    if len(name) < 2:
        errors["name"] = "Escribe tu nombre completo."
    if len(username) < 3:
        errors["username"] = "El nombre de usuario debe tener al menos 3 caracteres."
    elif await db.users.find_one({"username": username}, {"_id": 0, "id": 1}):
        errors["username"] = "Este nombre de usuario ya está en uso."
    if data.role not in ROLES:
        errors["role"] = "Selecciona un rol: Estudiante, Monitor o Profesor."
    if data.program not in PROGRAM_NAMES:
        errors["program"] = "Selecciona un programa académico válido."
    if data.role == "student" and data.semester is None:
        errors["semester"] = "El semestre es obligatorio para estudiantes."
    if data.semester is not None and not 1 <= data.semester <= 12:
        errors["semester"] = "Selecciona un semestre entre 1 y 12."
    password_error = _password_error(data.password, MIN_PASSWORD_LENGTH)
    if password_error:
        errors["password"] = password_error

    if await db.users.find_one({"email": email}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=409, detail=EMAIL_TAKEN_MESSAGE)
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})

    now = _now().isoformat()
    user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "username": username,
        "email": email,
        "password": hash_password(data.password),
        "role": data.role,
        "program": data.program,
        "semester": data.semester,
        "bio": "Perfil académico en construcción.",
        "phone": "",
        "contact_info": "",
        "academic_info": "",
        "picture": None,
        "rating": 0,
        "rating_count": 0,
        "links": [],
        "profile_completed": True,
        "preferences": {"accessibility": dict(DEFAULT_ACCESSIBILITY)},
        "auth_provider": "password",
        "created_at": now,
        "last_login": now,
    }
    try:
        await db.users.insert_one(user)
    except DuplicateKeyError as exc:
        if "username" in str(exc):
            raise HTTPException(status_code=422, detail={"fields": {"username": "Este nombre de usuario ya está en uso."}})
        raise HTTPException(status_code=409, detail=EMAIL_TAKEN_MESSAGE)

    user.pop("_id", None)
    return _session_payload(user)


@router.post("/login")
async def login(data: Login):
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})

    if not user or not verify_password(data.password, user.get("password")):
        if user and user.get("auth_provider") == "google":
            raise HTTPException(
                status_code=401,
                detail="Esta cuenta se creó con Google. Usa «Continuar con Google» o recupera tu contraseña.",
            )
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos.")

    user = await _ensure_user_id(user)
    user["last_login"] = _now().isoformat()
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": user["last_login"]}})
    return _session_payload(user)


@router.get("/me")
async def me(user=Depends(current_user)):
    return public_user(user)


@router.post("/logout")
async def logout():
    # JWT sin estado: el cliente elimina el token de localStorage.
    return {"message": "Sesión cerrada correctamente."}


# ============================================================
# GOOGLE (EMERGENT AUTH)
# ============================================================

@router.get("/google/login")
async def google_login(redirect: Optional[str] = Query(None, description="URL del frontend a la que se vuelve tras Google")):
    """Inicia el flujo de Google.

    El frontend envía ``redirect`` calculado con ``window.location`` (origen + ruta actual).
    Si no llega (acceso directo), se usa FRONTEND_URL (GitHub Pages).
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    target = _safe_redirect(redirect)
    return RedirectResponse(url=f"{EMERGENT_AUTH_LOGIN_URL}?redirect={quote(target, safe='')}", status_code=302)


@router.post("/google")
async def google_auth(data: GoogleAuth):
    session_id = (data.session_id or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Falta el session_id de Google.")

    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.get(EMERGENT_SESSION_DATA_URL, headers={"X-Session-ID": session_id})
    except httpx.HTTPError as exc:
        logger.error("Error de red validando la sesión de Google: %s", exc)
        raise HTTPException(status_code=502, detail="No pudimos comunicarnos con el proveedor de autenticación. Inténtalo de nuevo.")

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Sesión de Google inválida o expirada. Inténtalo nuevamente.")

    try:
        profile = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Respuesta inválida del proveedor de autenticación.")

    email = (profile.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google no devolvió un correo electrónico válido.")

    now = _now().isoformat()
    user = await db.users.find_one({"email": email})

    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "name": (profile.get("name") or email.split("@")[0].title()).strip(),
            "username": "",
            "email": email,
            "password": hash_password(secrets.token_urlsafe(32)),
            "role": "",
            "program": "",
            "semester": None,
            "bio": "",
            "phone": "",
            "contact_info": "",
            "academic_info": "",
            "links": [],
            "picture": profile.get("picture"),
            "auth_provider": "google",
            "rating": 0,
            "rating_count": 0,
            "profile_completed": False,
            "preferences": {"accessibility": dict(DEFAULT_ACCESSIBILITY)},
            "created_at": now,
            "last_login": now,
        }
        try:
            await db.users.insert_one(user)
            user.pop("_id", None)
        except DuplicateKeyError:
            user = await _ensure_user_id(await db.users.find_one({"email": email}))
    else:
        user = await _ensure_user_id(user)
        update = {"last_login": now}
        if profile.get("picture") and not (user.get("picture") or "").startswith("/api/files/"):
            update["picture"] = profile["picture"]
        if not user.get("name") and profile.get("name"):
            update["name"] = profile["name"]
        update["profile_completed"] = _profile_completed({**user, **update})
        await db.users.update_one({"id": user["id"]}, {"$set": update})
        user = {**user, **update}

    return _session_payload(user)


# ============================================================
# RECUPERACIÓN DE CONTRASEÑA
# ============================================================

GENERIC_FORGOT_MESSAGE = (
    "Si existe una cuenta asociada a este correo, recibirás un enlace para restablecer tu contraseña."
)


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    email = (data.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Escribe un correo electrónico válido.")
    if not _smtp_configured():
        logger.error("Recuperación de contraseña solicitada pero SMTP_USER/SMTP_PASSWORD no están configurados.")
        raise HTTPException(
            status_code=503,
            detail="La recuperación por correo no está disponible en este momento. Contacta al administrador.",
        )

    user = await db.users.find_one({"email": email}, {"_id": 0, "email": 1, "name": 1})
    if user:
        raw_token = secrets.token_urlsafe(32)
        minutes = int(os.getenv("PASSWORD_RESET_MINUTES") or "30")
        now = _now()
        await db.password_reset_tokens.delete_many({"email": email})
        await db.password_reset_tokens.insert_one({
            "token_hash": _hash_reset_token(raw_token),
            "email": email,
            "expires_at": now + timedelta(minutes=minutes),
            "used": False,
            "created_at": now,
        })
        background_tasks.add_task(_send_reset_email, email, _reset_link(raw_token), user.get("name") or "usuario", minutes)

    # Respuesta idéntica exista o no la cuenta (evita enumeración de correos)
    return {"message": GENERIC_FORGOT_MESSAGE}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    raw_token = (data.token or "").strip()
    new_password = data.password or ""
    if not raw_token:
        raise HTTPException(status_code=400, detail="El enlace de recuperación no es válido o está incompleto.")
    password_error = _password_error(new_password, MIN_RESET_PASSWORD_LENGTH)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)

    token_hash = _hash_reset_token(raw_token)
    record = await db.password_reset_tokens.find_one({"token_hash": token_hash, "used": False})
    expires_at = _as_aware(record.get("expires_at")) if record else None
    if not record or not expires_at or expires_at < _now():
        raise HTTPException(status_code=400, detail="El enlace de recuperación es inválido, expiró o ya fue utilizado.")

    # Consumo atómico: solo una petición puede marcar el token como usado
    consumed = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": token_hash, "used": False},
        {"$set": {"used": True, "used_at": _now()}},
    )
    if not consumed:
        raise HTTPException(status_code=400, detail="El enlace de recuperación es inválido, expiró o ya fue utilizado.")

    result = await db.users.update_one(
        {"email": record["email"]},
        {"$set": {"password": hash_password(new_password), "password_updated_at": _now().isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="La cuenta asociada a este enlace ya no existe.")

    return {"message": "Tu contraseña fue actualizada. Ya puedes iniciar sesión."}
