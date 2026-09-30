import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import aiosmtplib
import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field

# Configuración de logs
logger = logging.getLogger(__name__)

# Configuración de hashing de contraseñas (Bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Instancia de Router
router = APIRouter(prefix="/auth", tags=["Autenticación"])

# IMPORTANTE: Asume que 'db' es tu cliente de MongoDB Async (Motor)
# importado desde la configuración de tu base de datos.
# Ejemplo: from app.database import db
from app.database import db  # Ajusta esta importación según tu estructura


# ==========================================
# MODELOS PYDANTIC (Esquemas de Entrada)
# ==========================================

class GoogleAuthRequest(BaseModel):
    session_id: str = Field(..., description="ID de sesión proporcionado por Google/OAuth")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8, description="Nueva contraseña (mínimo 8 caracteres)")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=8)


# ==========================================
# FUNCIONES AUXILIARES Y SEGURIDAD
# ==========================================

def _hash_reset_token(raw_token: str) -> str:
    """Genera un hash SHA-256 seguro del token para almacenamiento."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


async def _send_reset_email_async(to_email: str, reset_url: str, user_name: str) -> None:
    """
    Envía el correo de recuperación de contraseña de forma asíncrona usando aiosmtplib.
    Se ejecuta en segundo plano para no demorar la respuesta de la API.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM", smtp_user)

    if not smtp_user or not smtp_password:
        logger.error("No se han configurado las credenciales SMTP en las variables de entorno.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Recuperación de contraseña"
    msg["From"] = from_email
    msg["To"] = to_email

    text_content = f"Hola {user_name},\n\nPara restablecer tu contraseña, haz clic en el siguiente enlace:\n{reset_url}\n\nSi no solicitaste este cambio, ignora este mensaje."
    html_content = f"""
    <html>
      <body>
        <p>Hola <strong>{user_name}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p><a href="{reset_url}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Restablecer contraseña</a></p>
        <p>O copia y pega el siguiente enlace en tu navegador:<br>{reset_url}</p>
        <p>Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
      </body>
    </html>
    """

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            start_tls=True,
            timeout=15.0,
        )
        logger.info(f"Correo de recuperación enviado con éxito a {to_email}")
    except Exception as exc:
        # Registramos el error de forma interna sin exponer detalles al usuario
        logger.error(f"Error al enviar correo de recuperación a {to_email}: {exc}")


# ==========================================
# ENDPOINTS / RUTAS DE AUTENTICACIÓN
# ==========================================

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest):
    """Registro de usuario mediante correo y contraseña."""
    email = data.email.strip().lower()

    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado.",
        )

    hashed_password = pwd_context.hash(data.password)
    new_user = {
        "name": data.name.strip(),
        "email": email,
        "password": hashed_password,
        "auth_provider": "password",
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.users.insert_one(new_user)

    return {
        "message": "Usuario registrado exitosamente.",
        "user_id": str(result.inserted_id),
    }


@router.post("/login")
async def login(data: LoginRequest):
    """Inicio de sesión con credenciales tradicionales."""
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})

    if not user or "password" not in user or not pwd_context.verify(data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
        )

    return {
        "message": "Inicio de sesión exitoso.",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
        },
    }


@router.post("/google")
async def google_auth(data: GoogleAuthRequest):
    """Autenticación OAuth con Google utilizando cliente HTTP asíncrono (httpx)."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": data.session_id},
            )
    except httpx.RequestError as exc:
        logger.error(f"Error de red al validar sesión con Google: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo comunicar con el proveedor de autenticación.",
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión de Google inválida o expirada.",
        )

    profile = resp.json()
    email = profile.get("email", "").strip().lower()

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El perfil de Google no contiene un correo electrónico válido.",
        )

    user = await db.users.find_one({"email": email})

    if not user:
        new_user = {
            "name": profile.get("name", "Usuario Google"),
            "email": email,
            "picture": profile.get("picture"),
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc),
        }
        res = await db.users.insert_one(new_user)
        user_id = str(res.inserted_id)
    else:
        user_id = str(user["_id"])
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}},
        )

    return {
        "message": "Autenticación con Google exitosa.",
        "user": {
            "id": user_id,
            "email": email,
            "name": profile.get("name"),
        },
    }


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
):
    """
    Solicitud de recuperación de contraseña.
    Protegido contra Timing Attacks y ejecuciones bloqueantes en I/O.
    """
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})

    if user:
        raw_token = secrets.token_urlsafe(32)
        token_hash = _hash_reset_token(raw_token)

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        reset_url = f"{frontend_url}/restablecer-contrasena?token={raw_token}"

        expires_minutes = int(os.getenv("PASSWORD_RESET_MINUTES", "30"))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

        # Invalida tokens anteriores del mismo usuario
        await db.password_reset_tokens.delete_many({"email": email})

        # Registra el nuevo token utilizando objeto datetime BSON (compatible con TTL)
        await db.password_reset_tokens.insert_one({
            "token_hash": token_hash,
            "email": email,
            "expires_at": expires_at,
            "used": False,
            "created_at": datetime.now(timezone.utc),
        })

        # Delega el envío de correo a tareas en segundo plano
        background_tasks.add_task(
            _send_reset_email_async,
            to_email=email,
            reset_url=reset_url,
            user_name=user.get("name") or "Usuario",
        )

    # Respuesta genérica consistente para evitar enumeración de cuentas
    return {
        "message": "Si la cuenta existe, se ha enviado un correo con instrucciones para restablecer la contraseña."
    }


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """
    Restablecimiento de contraseña consumiendo de forma atómica el token.
    Evita condiciones de carrera (TOCTOU).
    """
    raw_token = data.token.strip()
    new_password = data.password.strip()

    token_hash = _hash_reset_token(raw_token)
    now = datetime.now(timezone.utc)

    # Consumo ATÓMICO del token: Busca y marca como usado en una sola operación de BD
    reset_record = await db.password_reset_tokens.find_one_and_update(
        {
            "token_hash": token_hash,
            "used": False,
            "expires_at": {"$gt": now},
        },
        {
            "$set": {
                "used": True,
                "used_at": now,
            }
        },
    )

    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de recuperación es inválido, ha expirado o ya fue utilizado.",
        )

    email = reset_record["email"]
    hashed_password = pwd_context.hash(new_password)

    # Actualiza la contraseña del usuario
    update_result = await db.users.update_one(
        {"email": email},
        {
            "$set": {
                "password": hashed_password,
                "auth_provider": "password",
                "updated_at": now,
            }
        },
    )

    if update_result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario asociado a este token no existe.",
        )

    return {"message": "La contraseña ha sido actualizada correctamente."}