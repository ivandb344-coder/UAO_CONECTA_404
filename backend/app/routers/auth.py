from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

import hashlib
import html
import os
import secrets
import smtplib
import ssl
import uuid
import requests

from app.core.config import (
    db,
    pwd,
    PROGRAM_NAMES,
    ROLES,
    EMAIL_TAKEN_MESSAGE,
    DEFAULT_ACCESSIBILITY,
)
from app.core.security import token, current_user
from app.models.schemas import Register, Login, GoogleAuth
from app.services.users import public_user, _profile_completed


router = APIRouter()


# ============================================================
# GENERAL
# ============================================================

@router.get("/")
async def root():
    return {
        "message": "UAO Conecta API activa",
        "timezone": "America/Bogota",
    }


# ============================================================
# VALIDACIÓN DE CORREO
# ============================================================

@router.get("/auth/email-available")
async def email_available(email: str):
    value = (email or "").strip().lower()

    if not value or "@" not in value:
        return {
            "available": False,
            "reason": "Escribe un correo electrónico válido.",
        }

    if await db.users.find_one(
        {"email": value},
        {"_id": 0, "id": 1},
    ):
        return {
            "available": False,
            "reason": EMAIL_TAKEN_MESSAGE,
        }

    return {
        "available": True,
    }


# ============================================================
# REGISTRO
# ============================================================

@router.post("/auth/register")
async def register(data: Register):
    errors = {}

    username = data.username.strip().lower()
    email = data.email.strip().lower()

    if len(username) < 3:
        errors["username"] = (
            "El nombre de usuario debe tener al menos 3 caracteres."
        )
    elif await db.users.find_one(
        {"username": username},
        {"_id": 0},
    ):
        errors["username"] = (
            "Este nombre de usuario ya está en uso."
        )

    if data.role not in ROLES:
        errors["role"] = (
            "Selecciona un rol: Estudiante, Monitor o Profesor."
        )

    if data.program not in PROGRAM_NAMES:
        errors["program"] = (
            "Selecciona un programa académico válido."
        )

    if data.role == "student" and data.semester is None:
        errors["semester"] = (
            "El semestre es obligatorio para estudiantes."
        )

    if data.semester is not None and not 1 <= data.semester <= 12:
        errors["semester"] = (
            "Selecciona un semestre entre 1 y 12."
        )

    if len(data.password) < 6:
        errors["password"] = (
            "La contraseña debe tener al menos 6 caracteres."
        )

    if await db.users.find_one(
        {"email": email},
        {"_id": 0},
    ):
        raise HTTPException(
            status_code=409,
            detail=EMAIL_TAKEN_MESSAGE,
        )

    if errors:
        raise HTTPException(
            status_code=422,
            detail={"fields": errors},
        )

    payload = data.model_dump(exclude={"password"})

    payload["username"] = username
    payload["email"] = email

    user = {
        "id": str(uuid.uuid4()),
        **payload,
        "password": pwd.hash(data.password),
        "bio": "Perfil académico en construcción.",
        "rating": 0,
        "rating_count": 0,
        "profile_completed": True,
        "links": [],
        "preferences": {
            "accessibility": dict(DEFAULT_ACCESSIBILITY)
        },
        "auth_provider": "password",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        await db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail=EMAIL_TAKEN_MESSAGE,
        )

    return {
        "token": token(user),
        "user": public_user(user),
    }


# ============================================================
# LOGIN
# ============================================================

@router.post("/auth/login")
async def login(data: Login):
    email = data.email.strip().lower()

    user = (
        await db.users.find_one({"email": email})
        or await db.users.find_one({"email": data.email})
    )

    if not user or not pwd.verify(
        data.password,
        user["password"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos",
        )

    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "last_login": datetime.now(
                    timezone.utc
                ).isoformat()
            }
        },
    )

    return {
        "token": token(user),
        "user": public_user(user),
    }


# ============================================================
# GOOGLE / EMERGENT AUTH
# ============================================================

@router.post("/auth/google")
async def google_auth(data: GoogleAuth):
    try:
        resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={
                "X-Session-ID": data.session_id
            },
            timeout=15,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "No pudimos contactar el proveedor de "
                f"autenticación: {exc}"
            ),
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Sesión de Google inválida o expirada",
        )

    profile = resp.json()

    email = (
        profile.get("email") or ""
    ).strip().lower()

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Google no devolvió un correo válido",
        )

    user = await db.users.find_one(
        {"email": email}
    )

    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "name": (
                profile.get("name")
                or email.split("@")[0].title()
            ),
            "username": "",
            "email": email,
            "password": pwd.hash(
                str(uuid.uuid4())
            ),
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
            "preferences": {
                "accessibility": dict(
                    DEFAULT_ACCESSIBILITY
                )
            },
            "created_at": datetime.now(
                timezone.utc
            ).isoformat(),
        }

        try:
            await db.users.insert_one(user)
        except DuplicateKeyError:
            user = await db.users.find_one(
                {"email": email}
            )

    else:
        update = {
            "last_login": datetime.now(
                timezone.utc
            ).isoformat()
        }

        if (
            profile.get("picture")
            and not (
                user.get("picture") or ""
            ).startswith("/api/files/")
        ):
            update["picture"] = profile.get(
                "picture"
            )

        merged = {
            **user,
            **update,
        }

        update["profile_completed"] = (
            _profile_completed(merged)
        )

        await db.users.update_one(
            {"email": email},
            {"$set": update},
        )

        user = await db.users.find_one(
            {"email": email}
        )

    return {
        "token": token(user),
        "user": public_user(user),
    }


# ============================================================
# SESIÓN ACTUAL
# ============================================================

@router.get("/auth/me")
async def me(
    user=Depends(current_user),
):
    return public_user(user)


# ============================================================
# RECUPERACIÓN DE CONTRASEÑA
# ============================================================

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


def _hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()


async def _send_reset_email(
    email: str,
    reset_url: str,
    user_name: str = "usuario",
):
    smtp_host = os.getenv(
        "SMTP_HOST",
        "smtp.gmail.com",
    )

    smtp_port = int(
        os.getenv(
            "SMTP_PORT",
            "587",
        )
    )

    smtp_user = os.getenv(
        "SMTP_USER",
        "",
    )

    smtp_password = os.getenv(
        "SMTP_PASSWORD",
        "",
    )

    smtp_from = os.getenv(
        "SMTP_FROM",
        smtp_user,
    )

    if not smtp_user or not smtp_password:
        raise RuntimeError(
            "SMTP no está configurado correctamente."
        )

    safe_name = html.escape(
        (user_name or "usuario").strip()
    )

    message = EmailMessage()

    message["Subject"] = (
        "Restablece tu contraseña · UAO Conecta"
    )

    message["From"] = smtp_from
    message["To"] = email

    # ========================================================
    # VERSIÓN DE TEXTO PLANO
    # ========================================================

    message.set_content(
        f"""Hola, {user_name or "usuario"}.

Recibimos una solicitud para restablecer la contraseña de tu cuenta de UAO Conecta.

Para crear una nueva contraseña, utiliza el siguiente enlace:

{reset_url}

Este enlace será válido durante 30 minutos y solo puede utilizarse una vez.

Si no solicitaste este cambio, puedes ignorar este correo.

UAO Conecta
Encontrar · Coordinar · Saber a quién acudir.
"""
    )

    # ========================================================
    # VERSIÓN HTML
    # ========================================================

    html_content = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Restablecer contraseña · UAO Conecta</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f3f4f6;
    font-family:Arial, Helvetica, sans-serif;
    color:#1f2937;
">

    <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="
            background:#f3f4f6;
            padding:40px 16px;
        "
    >
        <tr>
            <td align="center">

                <!-- CONTENEDOR PRINCIPAL -->

                <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="
                        max-width:600px;
                        background:#ffffff;
                        border-radius:20px;
                        overflow:hidden;
                        border:1px solid #e5e7eb;
                    "
                >

                    <!-- ENCABEZADO -->

                    <tr>
                        <td style="
                            background:#111827;
                            padding:34px 36px;
                            text-align:center;
                        ">

                            <div style="
                                font-size:30px;
                                font-weight:700;
                                letter-spacing:-1px;
                                color:#ffffff;
                            ">
                                UAO
                                <span style="
                                    color:#d1d5db;
                                    font-weight:500;
                                ">
                                    Conecta
                                </span>
                            </div>

                            <div style="
                                margin-top:9px;
                                font-size:11px;
                                letter-spacing:2px;
                                color:#9ca3af;
                                text-transform:uppercase;
                            ">
                                Encontrar · Coordinar · Saber
                            </div>

                        </td>
                    </tr>


                    <!-- CONTENIDO -->

                    <tr>
                        <td style="
                            padding:42px 40px;
                        ">

                            <div style="
                                font-size:12px;
                                letter-spacing:1.5px;
                                text-transform:uppercase;
                                color:#6b7280;
                                font-weight:700;
                                margin-bottom:12px;
                            ">
                                Recuperación de contraseña
                            </div>

                            <h1 style="
                                margin:0 0 20px;
                                font-size:30px;
                                line-height:1.2;
                                color:#111827;
                            ">
                                Hola, {safe_name}
                            </h1>

                            <p style="
                                margin:0 0 16px;
                                font-size:16px;
                                line-height:1.7;
                                color:#4b5563;
                            ">
                                Recibimos una solicitud para restablecer
                                la contraseña de tu cuenta de
                                <strong>UAO Conecta</strong>.
                            </p>

                            <p style="
                                margin:0 0 30px;
                                font-size:16px;
                                line-height:1.7;
                                color:#4b5563;
                            ">
                                Para recuperar tu acceso, pulsa el botón
                                siguiente:
                            </p>


                            <!-- BOTÓN -->

                            <table
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                                align="center"
                                style="
                                    margin:0 auto 32px;
                                "
                            >
                                <tr>
                                    <td
                                        align="center"
                                        style="
                                            background:#111827;
                                            border-radius:10px;
                                        "
                                    >

                                        <a
                                            href="{reset_url}"
                                            style="
                                                display:inline-block;
                                                padding:16px 30px;
                                                color:#ffffff;
                                                text-decoration:none;
                                                font-size:15px;
                                                font-weight:700;
                                                border-radius:10px;
                                            "
                                        >
                                            Restablecer mi contraseña
                                        </a>

                                    </td>
                                </tr>
                            </table>


                            <!-- INFORMACIÓN DE SEGURIDAD -->

                            <table
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                                style="
                                    background:#f9fafb;
                                    border:1px solid #e5e7eb;
                                    border-radius:12px;
                                "
                            >
                                <tr>
                                    <td style="
                                        padding:18px 20px;
                                        font-size:14px;
                                        line-height:1.6;
                                        color:#6b7280;
                                    ">

                                        <strong style="
                                            color:#374151;
                                        ">
                                            Este enlace es temporal.
                                        </strong>

                                        Tendrás
                                        <strong>
                                            30 minutos
                                        </strong>
                                        para utilizarlo y solo podrá
                                        utilizarse una vez.

                                    </td>
                                </tr>
                            </table>


                            <!-- MENSAJE FINAL -->

                            <p style="
                                margin:28px 0 0;
                                font-size:13px;
                                line-height:1.7;
                                color:#9ca3af;
                            ">
                                Si no solicitaste recuperar tu contraseña,
                                puedes ignorar este correo. Tu contraseña
                                actual permanecerá sin cambios.
                            </p>

                        </td>
                    </tr>


                    <!-- PIE -->

                    <tr>
                        <td style="
                            background:#f9fafb;
                            border-top:1px solid #e5e7eb;
                            padding:26px 36px;
                            text-align:center;
                        ">

                            <div style="
                                font-size:14px;
                                font-weight:700;
                                color:#374151;
                            ">
                                UAO Conecta
                            </div>

                            <div style="
                                margin-top:7px;
                                font-size:12px;
                                color:#9ca3af;
                            ">
                                Encontrar · Coordinar · Saber a quién acudir.
                            </div>

                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
"""

    message.add_alternative(
        html_content,
        subtype="html",
    )

    context = ssl.create_default_context()

    with smtplib.SMTP(
        smtp_host,
        smtp_port,
        timeout=30,
    ) as server:

        server.ehlo()

        server.starttls(
            context=context
        )

        server.ehlo()

        server.login(
            smtp_user,
            smtp_password,
        )

        server.send_message(message)


# ============================================================
# SOLICITAR RECUPERACIÓN
# ============================================================

@router.post("/auth/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
):
    email = (
        data.email or ""
    ).strip().lower()

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Debes ingresar un correo electrónico.",
        )

    user = await db.users.find_one(
        {"email": email}
    )

    # No revelamos si la cuenta existe.
    if not user:
        return {
            "message": (
                "Si existe una cuenta asociada a "
                "este correo, recibirás un enlace "
                "para recuperar tu contraseña."
            )
        }

    raw_token = secrets.token_urlsafe(32)

    token_hash = _hash_reset_token(
        raw_token
    )

    frontend_url = os.getenv(
        "FRONTEND_URL",
        "http://localhost:3000",
    ).rstrip("/")

    reset_url = (
        f"{frontend_url}"
        f"/restablecer-contrasena?token={raw_token}"
    )

    expires_minutes = int(
        os.getenv(
            "PASSWORD_RESET_MINUTES",
            "30",
        )
    )

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=expires_minutes
        )
    )

    # Elimina solicitudes anteriores de ese correo.
    await db.password_reset_tokens.delete_many(
        {
            "email": email
        }
    )

    # Guarda únicamente el hash del token.
    await db.password_reset_tokens.insert_one(
        {
            "token_hash": token_hash,
            "email": email,
            "expires_at": expires_at.isoformat(),
            "used": False,
        }
    )

    try:
        await _send_reset_email(
            email,
            reset_url,
            user.get("name") or "usuario",
        )

    except Exception as exc:

        await db.password_reset_tokens.delete_one(
            {
                "token_hash": token_hash
            }
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo enviar el correo de "
                f"recuperación: {exc}"
            ),
        )

    return {
        "message": (
            "Si existe una cuenta asociada a "
            "este correo, recibirás un enlace "
            "para recuperar tu contraseña."
        )
    }


# ============================================================
# RESTABLECER CONTRASEÑA
# ============================================================

@router.post("/auth/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
):
    new_password = (
        data.password or ""
    ).strip()

    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail=(
                "La contraseña debe tener al menos "
                "8 caracteres."
            ),
        )

    raw_token = (
        data.token or ""
    ).strip()

    if not raw_token:
        raise HTTPException(
            status_code=400,
            detail=(
                "El enlace de recuperación "
                "no es válido."
            ),
        )

    token_hash = _hash_reset_token(
        raw_token
    )

    reset_record = (
        await db.password_reset_tokens.find_one(
            {
                "token_hash": token_hash,
                "used": False,
            }
        )
    )

    if not reset_record:
        raise HTTPException(
            status_code=400,
            detail=(
                "El enlace de recuperación no es "
                "válido o ya fue utilizado."
            ),
        )

    try:
        expires_at = datetime.fromisoformat(
            reset_record["expires_at"]
        )

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(
                tzinfo=timezone.utc
            )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail=(
                "El enlace de recuperación "
                "no es válido."
            ),
        )

    if datetime.now(timezone.utc) > expires_at:
        await db.password_reset_tokens.delete_one(
            {
                "_id": reset_record["_id"]
            }
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "El enlace de recuperación "
                "ha expirado."
            ),
        )

    email = reset_record["email"]

    user = await db.users.find_one(
        {
            "email": email
        }
    )

    if not user:
        raise HTTPException(
            status_code=400,
            detail=(
                "No se encontró la cuenta asociada."
            ),
        )

    await db.users.update_one(
        {
            "email": email
        },
        {
            "$set": {
                "password": pwd.hash(
                    new_password
                ),
                "auth_provider": "password",
                "last_password_reset": (
                    datetime.now(
                        timezone.utc
                    ).isoformat()
                ),
            }
        },
    )

    await db.password_reset_tokens.update_one(
        {
            "_id": reset_record["_id"]
        },
        {
            "$set": {
                "used": True,
                "used_at": (
                    datetime.now(
                        timezone.utc
                    ).isoformat()
                ),
            }
        },
    )

    return {
        "message": (
            "Contraseña actualizada correctamente."
        )
    }

