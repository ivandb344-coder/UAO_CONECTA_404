from fastapi import HTTPException, Header
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt

from app.core.config import db, SECRET

def token(user, auth_method="password"):
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": user["id"],
            "exp": now + timedelta(days=7),
            "iat": int(now.timestamp()),
            "auth_method": auth_method,
        },
        SECRET,
        algorithm="HS256",
    )

async def current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(401, "Autenticación requerida")
    try:
        claims = jwt.decode(authorization.replace("Bearer ", ""), SECRET, algorithms=["HS256"])
        uid = claims["sub"]
    except Exception:
        raise HTTPException(401, "Sesión inválida")
    user = await db.users.find_one({"id": uid}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Usuario no encontrado")
    # Metadatos internos del JWT para operaciones que requieren autenticación reciente.
    # public_user selecciona campos explícitos y nunca expone estos valores.
    user["_auth_method"] = claims.get("auth_method")
    user["_auth_iat"] = claims.get("iat")
    return user

def _user_from_token(token: Optional[str]):
    if not token:
        return None
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])["sub"]
    except Exception:
        return None
