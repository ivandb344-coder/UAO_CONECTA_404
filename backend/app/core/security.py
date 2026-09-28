from fastapi import HTTPException, Header
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt

from app.core.config import db, SECRET

def token(user):
    return jwt.encode({"sub": user["id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)}, SECRET, algorithm="HS256")

async def current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(401, "Autenticación requerida")
    try:
        uid = jwt.decode(authorization.replace("Bearer ", ""), SECRET, algorithms=["HS256"])["sub"]
    except Exception:
        raise HTTPException(401, "Sesión inválida")
    user = await db.users.find_one({"id": uid}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Usuario no encontrado")
    return user

def _user_from_token(token: Optional[str]):
    if not token:
        return None
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])["sub"]
    except Exception:
        return None
