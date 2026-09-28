from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid, requests

from app.core.config import db, pwd, PROGRAM_NAMES, ROLES, EMAIL_TAKEN_MESSAGE, DEFAULT_ACCESSIBILITY
from app.core.security import token, current_user
from app.models.schemas import Register, Login, GoogleAuth
from app.services.users import public_user, _profile_completed
from pymongo.errors import DuplicateKeyError

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "UAO Conecta API activa", "timezone": "America/Bogota"}

@router.get("/auth/email-available")
async def email_available(email: str):
    value = (email or "").strip().lower()
    if not value or "@" not in value:
        return {"available": False, "reason": "Escribe un correo electrónico válido."}
    if await db.users.find_one({"email": value}, {"_id": 0, "id": 1}):
        return {"available": False, "reason": EMAIL_TAKEN_MESSAGE}
    return {"available": True}

@router.post("/auth/register")
async def register(data: Register):
    errors = {}
    username = data.username.strip().lower()
    email = data.email.strip().lower()
    if len(username) < 3:
        errors["username"] = "El nombre de usuario debe tener al menos 3 caracteres."
    elif await db.users.find_one({"username": username}, {"_id": 0}):
        errors["username"] = "Este nombre de usuario ya está en uso."
    if data.role not in ROLES:
        errors["role"] = "Selecciona un rol: Estudiante, Monitor o Profesor."
    if data.program not in PROGRAM_NAMES:
        errors["program"] = "Selecciona un programa académico válido."
    if data.role == "student" and data.semester is None:
        errors["semester"] = "El semestre es obligatorio para estudiantes."
    if data.semester is not None and not 1 <= data.semester <= 12:
        errors["semester"] = "Selecciona un semestre entre 1 y 12."
    if len(data.password) < 6:
        errors["password"] = "La contraseña debe tener al menos 6 caracteres."
    if await db.users.find_one({"email": email}, {"_id": 0}):
        raise HTTPException(409, EMAIL_TAKEN_MESSAGE)
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})
    payload = data.model_dump(exclude={"password"})
    payload["username"] = username
    payload["email"] = email
    user = {"id": str(uuid.uuid4()), **payload, "password": pwd.hash(data.password), "bio": "Perfil académico en construcción.", "rating": 0, "rating_count": 0, "profile_completed": True, "links": [], "preferences": {"accessibility": dict(DEFAULT_ACCESSIBILITY)}, "auth_provider": "password", "created_at": datetime.now(timezone.utc).isoformat()}
    try:
        await db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(409, EMAIL_TAKEN_MESSAGE)
    return {"token": token(user), "user": public_user(user)}

@router.post("/auth/login")
async def login(data: Login):
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email}) or await db.users.find_one({"email": data.email})
    if not user or not pwd.verify(data.password, user["password"]):
        raise HTTPException(401, "Correo o contraseña incorrectos")
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}})
    return {"token": token(user), "user": public_user(user)}

@router.post("/auth/demo")
async def demo_login():
    user = await db.users.find_one({"email": "estudiante@uao.edu.co"})
    if not user:
        user = {"id": "demo-student", "name": "Mariana Torres", "username": "mariana.t", "email": "estudiante@uao.edu.co", "password": pwd.hash("UAOdemo2026!"), "role": "student", "program": "Ingeniería Informática", "semester": 3, "bio": "Estudiante interesada en desarrollo y datos.", "rating": 4.8, "rating_count": 12}
        await db.users.insert_one(user)
    return {"token": token(user), "user": public_user(user)}

@router.post("/auth/demo-advisor")
async def demo_advisor_login():
    user = await db.users.find_one({"email": "monitor@uao.edu.co"})
    if not user:
        user = {"id": "demo-monitor", "name": "Laura Gómez", "username": "laura.g", "email": "monitor@uao.edu.co", "password": pwd.hash("UAOdemo2026!"), "role": "monitor", "program": "Ingeniería Informática", "semester": None, "bio": "Monitora de Cálculo y Programación.", "rating": 4.9, "rating_count": 32}
        await db.users.insert_one(user)
    return {"token": token(user), "user": public_user(user)}


@router.post("/auth/google")
async def google_auth(data: GoogleAuth):
    # Exchange Emergent session_id for user profile
    try:
        resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": data.session_id},
            timeout=15,
        )
    except Exception as exc:
        raise HTTPException(502, f"No pudimos contactar el proveedor de autenticación: {exc}")
    if resp.status_code != 200:
        raise HTTPException(401, "Sesión de Google inválida o expirada")
    profile = resp.json()
    email = (profile.get("email") or "").lower()
    if not email:
        raise HTTPException(400, "Google no devolvió un correo válido")
    user = await db.users.find_one({"email": email})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "name": profile.get("name") or email.split("@")[0].title(),
            "username": "",  # pending on Complete Profile
            "email": email,
            "password": pwd.hash(str(uuid.uuid4())),
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
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            await db.users.insert_one(user)
        except DuplicateKeyError:
            # Dos canjes simultáneos del mismo session_id: reutiliza la cuenta ya creada.
            user = await db.users.find_one({"email": email})
    else:
        # Cuenta existente: conserva rol, programa, semestre y foto personalizada. Solo actualiza la foto de Google si no hay una propia.
        update = {"last_login": datetime.now(timezone.utc).isoformat()}
        if profile.get("picture") and not (user.get("picture") or "").startswith("/api/files/"):
            update["picture"] = profile.get("picture")
        merged = {**user, **update}
        update["profile_completed"] = _profile_completed(merged)
        await db.users.update_one({"email": email}, {"$set": update})
        user = await db.users.find_one({"email": email})
    return {"token": token(user), "user": public_user(user)}

@router.get("/auth/me")
async def me(user=Depends(current_user)):
    return public_user(user)
