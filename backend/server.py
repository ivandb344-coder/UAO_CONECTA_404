from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pydantic import BaseModel, Field, EmailStr
from passlib.context import CryptContext
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Set
from urllib.parse import urlparse
import os, uuid, jwt, logging, requests, json, asyncio

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
file_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="uao_files")
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = os.environ.get("JWT_SECRET", "uao-conecta-development-secret")
async def put_object(path, data, content_type):
    """Guarda el binario privado en MongoDB GridFS; no depende de la credencial de IA."""
    await file_bucket.upload_from_stream(
        path,
        data,
        metadata={"content_type": content_type, "storage_provider": "mongodb_gridfs"},
    )
    return {"path": path, "size": len(data)}

async def get_object(path):
    """Lee el binario privado desde MongoDB GridFS."""
    try:
        stream = await file_bucket.open_download_stream_by_name(path)
    except Exception as exc:
        raise HTTPException(404, "El contenido del archivo no está disponible.") from exc
    data = await stream.read()
    metadata = stream.metadata or {}
    return data, metadata.get("content_type", "application/octet-stream")

app = FastAPI(title="UAO Conecta API")
api = APIRouter(prefix="/api")

PROGRAMS = [
    {"group": "Computación y Contenidos Digitales", "name": "Ingeniería Informática"},
    {"group": "Computación y Contenidos Digitales", "name": "Ingeniería de Datos e Inteligencia Artificial"},
    {"group": "Computación y Contenidos Digitales", "name": "Ingeniería Multimedia"},
    {"group": "Automatización e Industria", "name": "Ingeniería Industrial"},
    {"group": "Automatización e Industria", "name": "Ingeniería Mecatrónica"},
    {"group": "Automatización e Industria", "name": "Ingeniería de Manufactura"},
    {"group": "Ingenierías", "name": "Ingeniería Mecánica"},
    {"group": "Ingenierías", "name": "Ingeniería Eléctrica"},
    {"group": "Ingenierías", "name": "Ingeniería Electrónica y Telecomunicaciones"},
    {"group": "Ingenierías", "name": "Ingeniería Biomédica"},
    {"group": "Ingenierías", "name": "Ingeniería Ambiental"},
]
PROGRAM_NAMES = [p["name"] for p in PROGRAMS]
ROLES = {"student", "monitor", "professor"}
LINK_PLATFORMS = {"moodle", "whatsapp", "discord", "meet", "teams", "piazza", "telegram", "email", "linkedin", "custom"}
DEMO_SUBJECTS = [
    {"name": "Cálculo I", "code": "MAT101", "program": "Ingeniería Informática", "semester": 1, "professor": "Dra. Laura Gómez", "color": "teal"},
    {"name": "Programación", "code": "INF201", "program": "Ingeniería Informática", "semester": 2, "professor": "Dr. Andrés Rojas", "color": "blue"},
    {"name": "Física I", "code": "FIS101", "program": "Ingeniería Mecatrónica", "semester": 1, "professor": "Dr. Carlos Méndez", "color": "red"},
    {"name": "Ingeniería de Datos", "code": "DAT301", "program": "Ingeniería de Datos e Inteligencia Artificial", "semester": 3, "professor": "Dra. Paula Salazar", "color": "teal"},
]

# ---------- Models ----------
class Register(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str
    role: str = "student"
    program: str
    semester: Optional[int] = None

class Login(BaseModel):
    email: EmailStr
    password: str

class QuestionCreate(BaseModel):
    title: str
    description: str
    subject: str
    tags: List[str] = []
    anonymous: bool = False

class AnswerCreate(BaseModel):
    body: str

class BookingCreate(BaseModel):
    advisory_id: str
    note: str = ""

class BookingStatus(BaseModel):
    status: str  # Aceptada | Rechazada | Cancelada | Completada | No asistió

class AdvisoryCreate(BaseModel):
    subject: str
    topic: str
    date: str
    time: str
    mode: str = "Virtual"
    slots: int = 4
    place: str = ""
    link: str = ""
    active: bool = True

class AdvisoryPatch(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    mode: Optional[str] = None
    slots: Optional[int] = None
    place: Optional[str] = None
    link: Optional[str] = None
    active: Optional[bool] = None

class ChatMessage(BaseModel):
    body: str
    room: str = "general"

class AIQuestion(BaseModel):
    message: str
    history: List[dict] = []

class TaskCreate(BaseModel):
    title: str
    description: str
    due_date: str
    due_time: str = "23:59"
    materials: List[str] = []

class SubmissionCreate(BaseModel):
    text: str = ""
    link: str = ""
    file_id: str = ""

class FeedbackCreate(BaseModel):
    feedback: str
    grade: Optional[float] = None
    status: str = "Revisada"

class AnswerRatingCreate(BaseModel):
    rating: int
    comment: str = ""

class SubjectCreate(BaseModel):
    name: str
    code: str
    description: str = ""
    program: str
    semester: int
    schedule: str = ""
    additional_info: str = ""
    color: str = "teal"

class SubjectJoin(BaseModel):
    code: str

# ---------- Helpers ----------
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

def public_user(u):
    keys = ["id", "name", "username", "email", "role", "program", "semester", "bio", "picture",
            "phone", "contact_info", "academic_info", "links", "rating", "rating_count", "profile_completed"]
    out = {k: u.get(k) for k in keys}
    if out["profile_completed"] is None:
        out["profile_completed"] = _profile_completed(u)
    out["links"] = out.get("links") or []
    return out

def clean(doc):
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc

def _url_ok(u: str) -> bool:
    if not u or not isinstance(u, str):
        return False
    value = u.strip()
    if value.startswith(("mailto:", "tel:")):
        return len(value.split(":", 1)[1].strip()) > 0
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)

def _profile_completed(u: dict) -> bool:
    if not (u.get("username") and u.get("role") in ROLES and u.get("program") in PROGRAM_NAMES):
        return False
    if u.get("role") == "student":
        try:
            return 1 <= int(u.get("semester")) <= 12
        except (TypeError, ValueError):
            return False
    if u.get("semester") in (None, ""):
        return True
    try:
        return 1 <= int(u.get("semester")) <= 12
    except (TypeError, ValueError):
        return False

# ---------- Routes ----------
@api.get("/")
async def root():
    return {"message": "UAO Conecta API activa", "timezone": "America/Bogota"}

@api.post("/auth/register")
async def register(data: Register):
    errors = {}
    username = data.username.strip().lower()
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
    if await db.users.find_one({"email": data.email}, {"_id": 0}):
        raise HTTPException(409, "Este correo ya está registrado")
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})
    payload = data.model_dump(exclude={"password"})
    payload["username"] = username
    user = {"id": str(uuid.uuid4()), **payload, "password": pwd.hash(data.password), "bio": "Perfil académico en construcción.", "rating": 0, "rating_count": 0, "profile_completed": True, "links": [], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.users.insert_one(user)
    return {"token": token(user), "user": public_user(user)}

@api.post("/auth/login")
async def login(data: Login):
    user = await db.users.find_one({"email": data.email})
    if not user or not pwd.verify(data.password, user["password"]):
        raise HTTPException(401, "Correo o contraseña incorrectos")
    return {"token": token(user), "user": public_user(user)}

@api.post("/auth/demo")
async def demo_login():
    user = await db.users.find_one({"email": "estudiante@uao.edu.co"})
    if not user:
        user = {"id": "demo-student", "name": "Mariana Torres", "username": "mariana.t", "email": "estudiante@uao.edu.co", "password": pwd.hash("UAOdemo2026!"), "role": "student", "program": "Ingeniería Informática", "semester": 3, "bio": "Estudiante interesada en desarrollo y datos.", "rating": 4.8, "rating_count": 12}
        await db.users.insert_one(user)
    return {"token": token(user), "user": public_user(user)}

@api.post("/auth/demo-advisor")
async def demo_advisor_login():
    user = await db.users.find_one({"email": "monitor@uao.edu.co"})
    if not user:
        user = {"id": "demo-monitor", "name": "Laura Gómez", "username": "laura.g", "email": "monitor@uao.edu.co", "password": pwd.hash("UAOdemo2026!"), "role": "monitor", "program": "Ingeniería Informática", "semester": None, "bio": "Monitora de Cálculo y Programación.", "rating": 4.9, "rating_count": 32}
        await db.users.insert_one(user)
    return {"token": token(user), "user": public_user(user)}

class GoogleAuth(BaseModel):
    session_id: str

@api.post("/auth/google")
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
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    else:
        update = {"picture": profile.get("picture"), "last_login": datetime.now(timezone.utc).isoformat()}
        # Recompute profile_completed in case old accounts miss the flag
        merged = {**user, **update}
        merged["profile_completed"] = _profile_completed(merged)
        update["profile_completed"] = merged["profile_completed"]
        await db.users.update_one({"email": email}, {"$set": update})
        user = await db.users.find_one({"email": email})
    return {"token": token(user), "user": public_user(user)}

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return public_user(user)

@api.get("/programs")
async def programs():
    return PROGRAMS

@api.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    questions = await db.questions.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    bookings = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("date", 1).to_list(3)
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(10)
    return {
        "user": public_user(user),
        "subjects": subjects,
        "questions": questions,
        "bookings": bookings,
        "stats": {"subjects": len(subjects), "pending": len(bookings), "saved": await db.saved.count_documents({"user_id": user["id"]})},
    }

@api.get("/subjects")
async def subjects(user=Depends(current_user)):
    return await db.subjects.find({}, {"_id": 0}).to_list(100)

@api.post("/subjects")
async def create_subject(data: SubjectCreate, user=Depends(current_user)):
    errors = {}
    name = data.name.strip()
    code = data.code.strip().upper()
    if len(name) < 2:
        errors["name"] = "Escribe un nombre válido para la asignatura."
    if len(code) < 2:
        errors["code"] = "El código debe tener al menos 2 caracteres."
    if data.program not in PROGRAM_NAMES:
        errors["program"] = "Selecciona un programa académico válido."
    if data.semester < 1 or data.semester > 12:
        errors["semester"] = "Selecciona un semestre entre 1 y 12."
    if await db.subjects.find_one({"code": code}, {"_id": 0}):
        errors["code"] = "Ya existe una asignatura con este código."
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})
    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "code": code,
        "description": data.description.strip(),
        "program": data.program,
        "semester": data.semester,
        "schedule": data.schedule.strip(),
        "additional_info": data.additional_info.strip(),
        "color": data.color if data.color in {"teal", "blue", "red"} else "teal",
        "owner_id": user["id"],
        "creator_name": user["name"],
        "creator_role": user["role"],
        "professor": user["name"],
        "access_code": uuid.uuid4().hex[:8].upper(),
        "members": [user["id"]],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.subjects.insert_one(doc)
    return clean(doc)

@api.post("/subjects/join")
async def join_subject(data: SubjectJoin, user=Depends(current_user)):
    code = data.code.strip().upper()
    subject = await db.subjects.find_one({"access_code": code}, {"_id": 0})
    if not subject:
        raise HTTPException(404, "No encontramos una asignatura con ese código de unión.")
    await db.subjects.update_one({"id": subject["id"]}, {"$addToSet": {"members": user["id"]}})
    subject["members"] = list({*(subject.get("members") or []), user["id"]})
    return subject

async def _file_meta(file_id: str):
    if not file_id:
        return None
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0, "id": 1, "name": 1, "storage_path": 1, "content_type": 1})
    return record

async def _can_review_task(task: dict, user: dict) -> bool:
    if user["role"] not in ("professor", "monitor"):
        return False
    if task.get("author_id") == user["id"]:
        return True
    subject = await db.subjects.find_one({"id": task.get("subject_id")}, {"_id": 0, "owner_id": 1})
    return bool(subject and subject.get("owner_id") == user["id"])

async def _reviewable_tasks(user: dict):
    owned = await db.subjects.find({"owner_id": user["id"]}, {"_id": 0, "id": 1}).to_list(500)
    query = {"$or": [{"author_id": user["id"]}, {"subject_id": {"$in": [s["id"] for s in owned]}}]}
    return await db.tasks.find(query, {"_id": 0}).to_list(1000)

@api.get("/subjects/{subject_id}/tasks")
async def subject_tasks(subject_id: str, user=Depends(current_user)):
    tasks = await db.tasks.find({"subject_id": subject_id}, {"_id": 0}).sort("due_date", 1).to_list(100)
    for task in tasks:
        submission = await db.submissions.find_one({"task_id": task["id"], "student_id": user["id"]}, {"_id": 0})
        if submission:
            submission["file"] = await _file_meta(submission.get("file_id"))
        task["submission"] = submission
        if user["role"] != "student":
            task["submissions_count"] = await db.submissions.count_documents({"task_id": task["id"]})
    return tasks

@api.get("/submissions/incoming")
async def incoming_submissions(user=Depends(current_user)):
    if user["role"] == "student":
        raise HTTPException(403, "Solo profesores y monitores tienen bandeja de revisión")
    tasks = await _reviewable_tasks(user)
    task_map = {t["id"]: t for t in tasks}
    subject_ids = list({t["subject_id"] for t in tasks})
    subjects = {s["id"]: s for s in await db.subjects.find({"id": {"$in": subject_ids}}, {"_id": 0}).to_list(500)}
    items = await db.submissions.find({"task_id": {"$in": list(task_map)}}, {"_id": 0}).sort("submitted_at", -1).to_list(1000)
    for item in items:
        task = task_map[item["task_id"]]
        subject = subjects.get(task["subject_id"], {})
        item["task"] = {"id": task["id"], "title": task["title"], "due_date": task.get("due_date"), "due_time": task.get("due_time")}
        item["subject"] = {"id": subject.get("id"), "name": subject.get("name"), "code": subject.get("code")}
        item["file"] = await _file_meta(item.get("file_id"))
    return items

@api.post("/subjects/{subject_id}/tasks")
async def create_task(subject_id: str, data: TaskCreate, user=Depends(current_user)):
    if user["role"] not in ["professor", "monitor"]:
        raise HTTPException(403, "Solo profesores y monitores pueden crear tareas")
    if not await db.subjects.find_one({"id": subject_id}):
        raise HTTPException(404, "Asignatura no encontrada")
    task = {"id": str(uuid.uuid4()), "subject_id": subject_id, **data.model_dump(), "author": user["name"], "author_id": user["id"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.tasks.insert_one(task)
    return clean(task)

@api.post("/tasks/{task_id}/submissions")
async def submit_task(task_id: str, data: SubmissionCreate, user=Depends(current_user)):
    if user["role"] != "student":
        raise HTTPException(403, "Las entregas están disponibles para estudiantes")
    if not await db.tasks.find_one({"id": task_id}):
        raise HTTPException(404, "Tarea no encontrada")
    if data.file_id:
        attached = await db.files.find_one({"id": data.file_id, "owner_id": user["id"], "is_deleted": False}, {"_id": 0})
        if not attached:
            raise HTTPException(status_code=422, detail={"fields": {"file_id": "El archivo de la entrega no es válido o no te pertenece."}})
    submission = {"id": str(uuid.uuid4()), "task_id": task_id, "student_id": user["id"], "student": user["name"], **data.model_dump(), "status": "Entregada", "submitted_at": datetime.now(timezone.utc).isoformat(), "feedback": "", "grade": None}
    await db.submissions.update_one({"task_id": task_id, "student_id": user["id"]}, {"$set": submission}, upsert=True)
    return clean(submission)

@api.patch("/submissions/{submission_id}/feedback")
async def give_feedback(submission_id: str, data: FeedbackCreate, user=Depends(current_user)):
    if user["role"] not in ["professor", "monitor"]:
        raise HTTPException(403, "Solo profesores y monitores pueden revisar entregas")
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(404, "Entrega no encontrada")
    task = await db.tasks.find_one({"id": submission["task_id"]}, {"_id": 0})
    if not task or not await _can_review_task(task, user):
        raise HTTPException(403, "Solo puedes revisar entregas de tus asignaturas o tareas")
    await db.submissions.update_one({"id": submission_id}, {"$set": {**data.model_dump(), "reviewer_id": user["id"], "reviewer": user["name"], "reviewed_at": datetime.now(timezone.utc).isoformat()}})
    await _create_notification(submission["student_id"], "entrega_revisada", f"Tu entrega fue {data.status.lower()}", f"{task['title']} — {data.feedback[:120]}", f"/asignaturas/{task['subject_id']}")
    return await db.submissions.find_one({"id": submission_id}, {"_id": 0})

@api.get("/people")
async def people(q: str = "", role: str = "", user=Depends(current_user)):
    filt = {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"username": {"$regex": q, "$options": "i"}}, {"program": {"$regex": q, "$options": "i"}}]}
    if role:
        filt["role"] = role
    return [public_user(x) for x in await db.users.find(filt, {"_id": 0, "password": 0}).to_list(50)]

@api.get("/profiles/{uid}")
async def profile(uid: str, user=Depends(current_user)):
    item = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    if not item:
        raise HTTPException(404, "Perfil no encontrado")
    return item

# ---------- Profile edit + Links ----------
class ProfilePatch(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None
    program: Optional[str] = None
    semester: Optional[int] = None
    bio: Optional[str] = None
    picture: Optional[str] = None
    phone: Optional[str] = None
    contact_info: Optional[str] = None
    academic_info: Optional[str] = None

class LinkCreate(BaseModel):
    platform: str
    url: str
    label: Optional[str] = None
    icon: Optional[str] = None
    visible: bool = True

class LinkPatch(BaseModel):
    platform: Optional[str] = None
    url: Optional[str] = None
    label: Optional[str] = None
    icon: Optional[str] = None
    visible: Optional[bool] = None

@api.get("/profile/username-available")
async def username_available(u: str, user=Depends(current_user)):
    u = (u or "").strip().lower()
    if not u:
        return {"available": False, "reason": "El nombre de usuario es obligatorio."}
    if len(u) < 3:
        return {"available": False, "reason": "El nombre de usuario debe tener al menos 3 caracteres."}
    other = await db.users.find_one({"username": u, "id": {"$ne": user["id"]}}, {"_id": 0})
    if other:
        return {"available": False, "reason": "Este nombre de usuario ya está en uso."}
    return {"available": True}

@api.patch("/profile/me")
async def update_profile(data: ProfilePatch, user=Depends(current_user)):
    payload = data.model_dump(exclude_unset=True)
    errors = {}
    if "username" in payload:
        username = (payload["username"] or "").strip().lower()
        if not username:
            errors["username"] = "El nombre de usuario es obligatorio."
        elif len(username) < 3:
            errors["username"] = "El nombre de usuario debe tener al menos 3 caracteres."
        else:
            other = await db.users.find_one({"username": username, "id": {"$ne": user["id"]}}, {"_id": 0})
            if other:
                errors["username"] = "Este nombre de usuario ya está en uso."
        payload["username"] = username
    if "role" in payload:
        if payload["role"] not in ROLES:
            errors["role"] = "Selecciona un rol: Estudiante, Monitor o Profesor."
    if "program" in payload:
        if payload["program"] not in PROGRAM_NAMES:
            errors["program"] = "Selecciona tu programa académico."
    if "semester" in payload and payload["semester"] is not None:
        try:
            s = int(payload["semester"])
            if s < 1 or s > 12:
                errors["semester"] = "Selecciona un semestre entre 1 y 12."
            else:
                payload["semester"] = s
        except (TypeError, ValueError):
            errors["semester"] = "Selecciona un semestre válido."
    if "name" in payload and not (payload["name"] or "").strip():
        errors["name"] = "El nombre visible no puede quedar vacío."
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})
    merged = {**user, **payload}
    payload["profile_completed"] = _profile_completed(merged)
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$set": payload})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return public_user(updated)

@api.post("/profile/photo")
async def upload_profile_photo(file: UploadFile = File(...), user=Depends(current_user)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(422, "Solo se permiten imágenes para la foto de perfil.")
    ext = Path(file.filename).suffix.lower() or ".jpg"
    storage_path = f"uao-conecta/avatars/{user['id']}/{uuid.uuid4()}{ext}"
    content = await file.read()
    result = await put_object(storage_path, content, file.content_type or "image/jpeg")
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "name": file.filename or "foto-de-perfil",
        "storage_path": result["path"],
        "content_type": file.content_type or "image/jpeg",
        "owner_id": user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    picture_url = f"/api/files/{result['path']}"
    await db.users.update_one({"id": user["id"]}, {"$set": {"picture": picture_url}})
    return {"picture": picture_url}

@api.post("/profile/links")
async def add_link(data: LinkCreate, user=Depends(current_user)):
    platform = (data.platform or "").lower()
    if platform not in LINK_PLATFORMS:
        raise HTTPException(status_code=422, detail={"fields": {"platform": "Selecciona una plataforma válida."}})
    if not _url_ok(data.url):
        raise HTTPException(status_code=422, detail={"fields": {"url": "Ingresa una URL válida."}})
    label = (data.label or "").strip()
    if platform == "custom" and not label:
        raise HTTPException(status_code=422, detail={"fields": {"label": "Escribe un nombre para el enlace personalizado."}})
    link = {
        "id": str(uuid.uuid4()),
        "platform": platform,
        "url": data.url.strip(),
        "label": label or None,
        "icon": (data.icon or "").strip() or None,
        "visible": bool(data.visible),
    }
    await db.users.update_one({"id": user["id"]}, {"$push": {"links": link}})
    return link

@api.patch("/profile/links/{lid}")
async def edit_link(lid: str, data: LinkPatch, user=Depends(current_user)):
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "links": 1})
    links = doc.get("links") or []
    target = next((l for l in links if l["id"] == lid), None)
    if not target:
        raise HTTPException(404, "Enlace no encontrado")
    updates = data.model_dump(exclude_unset=True)
    errors = {}
    if "url" in updates and not _url_ok(updates["url"]):
        errors["url"] = "Ingresa una URL válida."
    if "platform" in updates and updates["platform"] not in LINK_PLATFORMS:
        errors["platform"] = "Selecciona una plataforma válida."
    final_platform = updates.get("platform", target.get("platform"))
    final_label = updates.get("label", target.get("label"))
    if final_platform == "custom" and not (final_label or "").strip():
        errors["label"] = "Escribe un nombre para el enlace personalizado."
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})
    target.update({k: v.strip() if isinstance(v, str) else v for k, v in updates.items() if v is not None})
    await db.users.update_one({"id": user["id"]}, {"$set": {"links": links}})
    return target

@api.delete("/profile/links/{lid}")
async def delete_link(lid: str, user=Depends(current_user)):
    await db.users.update_one({"id": user["id"]}, {"$pull": {"links": {"id": lid}}})
    return {"ok": True}

# ---------- Dudas ----------
@api.get("/questions")
async def questions(user=Depends(current_user)):
    return await db.questions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api.post("/questions")
async def create_question(data: QuestionCreate, user=Depends(current_user)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "author": None if data.anonymous else user["name"], "author_id": user["id"], "answers": [], "accepted_id": None, "status": "Sin respuesta", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.questions.insert_one(doc)
    return clean(doc)

@api.get("/questions/{qid}")
async def question_detail(qid: str, user=Depends(current_user)):
    question = await db.questions.find_one({"id": qid}, {"_id": 0})
    if not question:
        raise HTTPException(404, "Duda no encontrada")
    for answer_item in question.get("answers", []):
        ratings = await db.answer_ratings.find({"answer_id": answer_item["id"]}, {"_id": 0}).to_list(1000)
        answer_item["rating"] = round(sum(r["rating"] for r in ratings) / len(ratings), 2) if ratings else 0
        answer_item["rating_count"] = len(ratings)
        answer_item["my_rating"] = next((r["rating"] for r in ratings if r["user_id"] == user["id"]), None)
        answer_item["is_accepted"] = question.get("accepted_id") == answer_item["id"]
        answer_item["can_rate"] = answer_item.get("author_id") != user["id"]
    question["is_owner"] = question.get("author_id") == user["id"]
    return question

@api.post("/questions/{qid}/answers")
async def answer(qid: str, data: AnswerCreate, user=Depends(current_user)):
    ans = {"id": str(uuid.uuid4()), "body": data.body, "author": user["name"], "author_id": user["id"], "role": user["role"], "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.questions.update_one({"id": qid}, {"$push": {"answers": ans}, "$set": {"status": "En discusión"}})
    if not result.matched_count:
        raise HTTPException(404, "Duda no encontrada")
    return ans

@api.post("/answers/{answer_id}/rating")
async def rate_answer(answer_id: str, data: AnswerRatingCreate, user=Depends(current_user)):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(422, "La valoración debe estar entre 1 y 5")
    question = await db.questions.find_one({"answers.id": answer_id}, {"_id": 0})
    if not question:
        raise HTTPException(404, "Respuesta no encontrada")
    answer_item = next(a for a in question.get("answers", []) if a["id"] == answer_id)
    if answer_item.get("author_id") == user["id"]:
        raise HTTPException(403, "No puedes valorar tu propia respuesta")
    rating = {"id": str(uuid.uuid4()), "answer_id": answer_id, "user_id": user["id"], "rating": data.rating, "comment": data.comment, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.answer_ratings.update_one({"answer_id": answer_id, "user_id": user["id"]}, {"$set": rating}, upsert=True)
    return {"rating": data.rating, "comment": data.comment}

@api.post("/questions/{qid}/accept/{aid}")
async def accept(qid: str, aid: str, user=Depends(current_user)):
    q = await db.questions.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Duda no encontrada")
    if q["author_id"] != user["id"]:
        raise HTTPException(403, "Solo quien publicó la duda puede aceptar")
    if not any(a["id"] == aid for a in q.get("answers", [])):
        raise HTTPException(404, "Respuesta no pertenece a esta duda")
    await db.questions.update_one({"id": qid}, {"$set": {"accepted_id": aid, "status": "Resuelta"}})
    return {"ok": True, "accepted_id": aid}

# ---------- Asesorías ----------
@api.get("/advisories")
async def advisories(mine: bool = False, user=Depends(current_user)):
    filt = {"advisor_id": user["id"]} if mine else {}
    docs = await db.advisories.find(filt, {"_id": 0}).sort("created_at", -1).to_list(200)
    for d in docs:
        d["booked"] = await db.bookings.count_documents({"advisory_id": d["id"], "status": {"$in": ["Pendiente", "Aceptada", "Completada"]}})
        d["available"] = max((d.get("slots", 0) or 0) - d["booked"], 0)
    return docs

@api.post("/advisories")
async def create_advisory(data: AdvisoryCreate, user=Depends(current_user)):
    if user["role"] == "student":
        raise HTTPException(403, "Solo monitores y profesores pueden publicar disponibilidad")
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "advisor": user["name"], "advisor_id": user["id"], "role": "Monitor" if user["role"] == "monitor" else "Profesor", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.advisories.insert_one(doc)
    return clean(doc)

@api.patch("/advisories/{aid}")
async def update_advisory(aid: str, data: AdvisoryPatch, user=Depends(current_user)):
    adv = await db.advisories.find_one({"id": aid}, {"_id": 0})
    if not adv:
        raise HTTPException(404, "Asesoría no encontrada")
    if adv.get("advisor_id") != user["id"]:
        raise HTTPException(403, "Solo puedes editar tu propia agenda")
    patch = {k: v for k, v in data.model_dump().items() if v is not None}
    if patch:
        await db.advisories.update_one({"id": aid}, {"$set": patch})
    return await db.advisories.find_one({"id": aid}, {"_id": 0})

@api.delete("/advisories/{aid}")
async def delete_advisory(aid: str, user=Depends(current_user)):
    adv = await db.advisories.find_one({"id": aid}, {"_id": 0})
    if not adv:
        raise HTTPException(404, "Asesoría no encontrada")
    if adv.get("advisor_id") != user["id"]:
        raise HTTPException(403, "Solo puedes eliminar tu propia agenda")
    await db.advisories.delete_one({"id": aid})
    return {"ok": True}

@api.post("/bookings")
async def create_booking(data: BookingCreate, user=Depends(current_user)):
    adv = await db.advisories.find_one({"id": data.advisory_id}, {"_id": 0})
    if not adv:
        raise HTTPException(404, "Asesoría no encontrada")
    if not adv.get("active", True):
        raise HTTPException(409, "Esta asesoría no está disponible")
    if adv.get("advisor_id") == user["id"]:
        raise HTTPException(409, "No puedes reservar tu propia asesoría")
    dup = await db.bookings.find_one({"user_id": user["id"], "advisory_id": data.advisory_id, "status": {"$in": ["Pendiente", "Aceptada"]}})
    if dup:
        raise HTTPException(409, "Ya tienes una solicitud para este horario")
    booked = await db.bookings.count_documents({"advisory_id": data.advisory_id, "status": {"$in": ["Pendiente", "Aceptada", "Completada"]}})
    if booked >= (adv.get("slots", 0) or 0):
        raise HTTPException(409, "Cupo lleno")
    conflict = await db.bookings.find_one({"user_id": user["id"], "date": adv.get("date"), "time": adv.get("time"), "status": {"$in": ["Pendiente", "Aceptada"]}})
    if conflict:
        raise HTTPException(409, "Ya tienes una reserva en ese horario")
    item = {
        "id": str(uuid.uuid4()),
        "advisory_id": data.advisory_id,
        "advisor": adv.get("advisor"),
        "advisor_id": adv.get("advisor_id"),
        "subject": adv.get("subject"),
        "topic": adv.get("topic"),
        "date": adv.get("date"),
        "time": adv.get("time"),
        "mode": adv.get("mode"),
        "place": adv.get("place", ""),
        "link": adv.get("link", ""),
        "note": data.note,
        "user_id": user["id"],
        "student": user["name"],
        "student_program": user.get("program"),
        "status": "Pendiente",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(item)
    return clean(item)

@api.get("/bookings")
async def bookings(user=Depends(current_user)):
    return await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api.get("/bookings/incoming")
async def incoming_bookings(user=Depends(current_user)):
    if user["role"] == "student":
        return []
    return await db.bookings.find({"advisor_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api.patch("/bookings/{bid}/status")
async def update_booking_status(bid: str, data: BookingStatus, user=Depends(current_user)):
    valid = {"Pendiente", "Aceptada", "Rechazada", "Cancelada", "Completada", "No asistió"}
    if data.status not in valid:
        raise HTTPException(422, "Estado no válido")
    booking = await db.bookings.find_one({"id": bid}, {"_id": 0})
    if not booking:
        raise HTTPException(404, "Reserva no encontrada")
    # Advisor can Aceptar/Rechazar/Completar/No asistió. Student can Cancelar la suya.
    if data.status == "Cancelada":
        if booking["user_id"] != user["id"] and booking.get("advisor_id") != user["id"]:
            raise HTTPException(403, "No puedes cancelar esta reserva")
    else:
        if booking.get("advisor_id") != user["id"]:
            raise HTTPException(403, "Solo el asesor puede cambiar este estado")
    await db.bookings.update_one({"id": bid}, {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}})
    # Fan-out notifications
    subject = booking.get("subject", "")
    topic = booking.get("topic", "")
    when = f"{booking.get('date','')} · {booking.get('time','')}".strip()
    notif_map = {
        "Aceptada":   {"target": booking["user_id"],    "title": "Tu asesoría fue aceptada", "body": f"{subject} · {topic} — {when}"},
        "Rechazada":  {"target": booking["user_id"],    "title": "Tu asesoría fue rechazada", "body": f"{subject} · {topic} — {when}"},
        "Cancelada":  {"target": booking["user_id"] if booking.get("advisor_id") == user["id"] else booking.get("advisor_id"),
                       "title": "Se canceló una asesoría", "body": f"{subject} · {topic} — {when}"},
        "Completada": {"target": booking["user_id"],    "title": "Asesoría completada", "body": f"{subject} · {topic} — {when}"},
        "No asistió": {"target": booking["user_id"],    "title": "Se marcó 'No asistió'", "body": f"{subject} · {topic} — {when}"},
    }
    n = notif_map.get(data.status)
    if n and n["target"]:
        await _create_notification(n["target"], data.status.lower().replace(" ", "_"), n["title"], n["body"], "/mis-asesorias" if n["target"] == booking["user_id"] else "/asesorias")
    return {"ok": True, "status": data.status}

# ---------- Chat (HTTP history + WebSocket realtime) ----------
class ConnectionManager:
    def __init__(self):
        # room -> list of {"ws": ws, "user": {id,name,role,initial}}
        self.rooms: Dict[str, List[dict]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, room: str, ws: WebSocket, user_meta: dict):
        await ws.accept()
        async with self.lock:
            self.rooms.setdefault(room, []).append({"ws": ws, "user": user_meta})

    async def disconnect(self, room: str, ws: WebSocket):
        async with self.lock:
            entries = self.rooms.get(room, [])
            self.rooms[room] = [e for e in entries if e["ws"] is not ws]
            if room in self.rooms and not self.rooms[room]:
                self.rooms.pop(room, None)

    async def broadcast(self, room: str, payload: dict):
        raw = json.dumps(payload)
        dead = []
        for entry in list(self.rooms.get(room, [])):
            try:
                await entry["ws"].send_text(raw)
            except Exception:
                dead.append(entry["ws"])
        for ws in dead:
            await self.disconnect(room, ws)

    def presence_payload(self, room: str) -> dict:
        # Deduplicate by user id so multiple tabs from the same user count once
        seen = {}
        for entry in self.rooms.get(room, []):
            u = entry["user"]
            seen[u["id"]] = u
        users = list(seen.values())
        return {"type": "presence", "size": len(users), "users": users}

manager = ConnectionManager()

def _user_from_token(token: Optional[str]):
    if not token:
        return None
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])["sub"]
    except Exception:
        return None

@api.get("/chat/summary")
async def chat_summary(user=Depends(current_user)):
    """Returns unread message counts per room for the current user."""
    seen_docs = await db.chat_seen.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    seen_map = {s["room"]: s["seen_at"] for s in seen_docs}
    pipeline = [
        {"$match": {"user_id": {"$ne": user["id"]}}},
        {"$group": {"_id": "$room", "last": {"$max": "$created_at"}, "count": {"$sum": 1}}},
    ]
    rooms = await db.messages.aggregate(pipeline).to_list(200)
    result = {}
    total = 0
    for r in rooms:
        room = r["_id"]
        seen_at = seen_map.get(room)
        if not seen_at:
            unread = r["count"]
        else:
            unread = await db.messages.count_documents({"room": room, "user_id": {"$ne": user["id"]}, "created_at": {"$gt": seen_at}})
        if unread:
            result[room] = unread
            total += unread
    return {"total": total, "rooms": result}

@api.get("/chat/{room}")
async def chat(room: str, user=Depends(current_user)):
    return await db.messages.find({"room": room}, {"_id": 0}).sort("created_at", 1).to_list(200)

@api.post("/chat/{room}/seen")
async def chat_mark_seen(room: str, user=Depends(current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_seen.update_one(
        {"user_id": user["id"], "room": room},
        {"$set": {"user_id": user["id"], "room": room, "seen_at": now}},
        upsert=True,
    )
    return {"ok": True, "seen_at": now}

@api.post("/chat")
async def send_chat(data: ChatMessage, user=Depends(current_user)):
    item = {"id": str(uuid.uuid4()), "body": data.body, "room": data.room, "author": user["name"], "user_id": user["id"], "role": user["role"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.messages.insert_one(item)
    await manager.broadcast(data.room, {"type": "message", "message": clean(dict(item))})
    return clean(item)

@app.websocket("/api/ws/chat/{room}")
async def chat_ws(websocket: WebSocket, room: str, token: str = Query(...)):
    uid = _user_from_token(token)
    if not uid:
        await websocket.close(code=4401)
        return
    user = await db.users.find_one({"id": uid}, {"_id": 0})
    if not user:
        await websocket.close(code=4401)
        return
    user_meta = {
        "id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "initial": (user["name"] or "?")[0].upper(),
        "picture": user.get("picture"),
    }
    await manager.connect(room, websocket, user_meta)
    try:
        # Send current presence to the new client and broadcast update to others
        await websocket.send_text(json.dumps(manager.presence_payload(room)))
        await manager.broadcast(room, manager.presence_payload(room))
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
            except Exception:
                continue
            body = (payload.get("body") or "").strip()
            file_info = payload.get("file")
            if not body and not file_info:
                continue
            item = {
                "id": str(uuid.uuid4()),
                "body": body[:2000],
                "room": room,
                "author": user["name"],
                "user_id": user["id"],
                "role": user["role"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            if isinstance(file_info, dict) and file_info.get("storage_path"):
                # Only accept files the sender actually owns (prevents forging storage_path)
                file_record = await db.files.find_one(
                    {"storage_path": file_info["storage_path"], "owner_id": user["id"], "is_deleted": False},
                    {"_id": 0},
                )
                if file_record:
                    item["file"] = {
                        "name": file_record.get("name") or (file_info.get("name") or "adjunto")[:120],
                        "storage_path": file_record["storage_path"],
                        "content_type": file_record.get("content_type") or "application/octet-stream",
                        "size": int(file_info.get("size") or 0),
                    }
            await db.messages.insert_one(item)
            await manager.broadcast(room, {"type": "message", "message": clean(dict(item))})
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(room, websocket)
        await manager.broadcast(room, manager.presence_payload(room))

# ---------- Files ----------
@api.post("/files")
async def upload(file: UploadFile = File(...), user=Depends(current_user)):
    ext = Path(file.filename).suffix.lower() or ".bin"
    storage_path = f"uao-conecta/uploads/{user['id']}/{uuid.uuid4()}{ext}"
    result = await put_object(storage_path, await file.read(), file.content_type or "application/octet-stream")
    item = {"id": str(uuid.uuid4()), "name": file.filename, "storage_path": result["path"], "content_type": file.content_type, "owner_id": user["id"], "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.files.insert_one(item)
    return clean(item)

async def _file_is_authorized(record: dict, user: dict) -> bool:
    if record.get("owner_id") == user["id"]:
        return True
    path = record.get("storage_path") or ""
    if path.startswith("uao-conecta/avatars/"):
        return True
    if await db.resources.find_one({"storage_path": path}, {"_id": 1}):
        return True
    if await db.messages.find_one({"file.storage_path": path}, {"_id": 1}):
        return True
    submission = await db.submissions.find_one({"file_id": record.get("id")}, {"_id": 0})
    if submission:
        if submission.get("student_id") == user["id"]:
            return True
        task = await db.tasks.find_one({"id": submission.get("task_id")}, {"_id": 0})
        if task and await _can_review_task(task, user):
            return True
    return False

@api.get("/files/{path:path}")
async def get_file(path: str, user=Depends(current_user)):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Archivo no encontrado")
    if not await _file_is_authorized(record, user):
        raise HTTPException(403, "No tienes permisos para abrir este archivo.")
    data, content_type = await get_object(path)
    filename = Path(record.get("name") or "archivo").name.replace('"', "")
    return Response(
        content=data,
        media_type=record.get("content_type") or content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"', "Access-Control-Expose-Headers": "Content-Disposition"},
    )

# ---------- Saved ----------
@api.post("/saved")
async def save(item: dict, user=Depends(current_user)):
    await db.saved.update_one({"user_id": user["id"], "item_id": item.get("item_id")}, {"$set": {**item, "user_id": user["id"]}}, upsert=True)
    return {"ok": True}

@api.get("/saved")
async def saved(user=Depends(current_user)):
    return await db.saved.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)

# ---------- AI ----------
@api.post("/ai")
async def ai(data: AIQuestion, user=Depends(current_user)):
    async def stream():
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"uao-{user['id']}",
            system_message="Eres el asistente de UAO Conecta. Responde en español, con claridad y brevedad. No inventes información institucional; si no sabes algo, dilo y recomienda fuentes oficiales.",
        ).with_model("openai", "gpt-5.4-mini")
        async for event in chat.stream_message(UserMessage(text=data.message)):
            if isinstance(event, TextDelta):
                yield event.content
            elif isinstance(event, StreamDone):
                break

    return StreamingResponse(stream(), media_type="text/plain", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ---------- Notifications, Resources, Search ----------
async def _create_notification(user_id: str, kind: str, title: str, body: str, link: str = ""):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "body": body,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)
    return doc

@api.get("/notifications")
async def list_notifications(user=Depends(current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    unread = sum(1 for i in items if not i.get("read"))
    return {"unread": unread, "items": items}

@api.post("/notifications/{nid}/read")
async def read_notification(nid: str, user=Depends(current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

@api.post("/notifications/read-all")
async def read_all_notifications(user=Depends(current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}

class ResourceCreate(BaseModel):
    title: str
    description: str = ""
    kind: str  # 'file' | 'link'
    url: Optional[str] = None
    storage_path: Optional[str] = None
    name: Optional[str] = None
    content_type: Optional[str] = None
    size: Optional[int] = None

@api.get("/subjects/{sid}/resources")
async def list_resources(sid: str, user=Depends(current_user)):
    return await db.resources.find({"subject_id": sid}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api.post("/subjects/{sid}/resources")
async def create_resource(sid: str, data: ResourceCreate, user=Depends(current_user)):
    if user["role"] not in ("professor", "monitor"):
        raise HTTPException(403, "Solo profesores y monitores pueden publicar recursos")
    if not await db.subjects.find_one({"id": sid}):
        raise HTTPException(404, "Asignatura no encontrada")
    if data.kind not in ("file", "link"):
        raise HTTPException(422, "Tipo de recurso no válido")
    payload = data.model_dump()
    errors = {}
    if not (payload.get("title") or "").strip():
        errors["title"] = "Escribe un título para el recurso."
    if payload["kind"] == "link" and not _url_ok(payload.get("url") or ""):
        errors["url"] = "Ingresa una URL válida."
    if payload["kind"] == "file" and not payload.get("storage_path"):
        errors["file"] = "Sube el archivo antes de publicarlo."
    if payload["kind"] == "file" and payload.get("storage_path"):
        owned_file = await db.files.find_one({"storage_path": payload["storage_path"], "owner_id": user["id"], "is_deleted": False}, {"_id": 0})
        if not owned_file:
            errors["file"] = "Solo puedes publicar archivos que hayas subido tú."
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})
    doc = {
        "id": str(uuid.uuid4()),
        "subject_id": sid,
        **payload,
        "owner_id": user["id"],
        "owner_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.resources.insert_one(doc)
    return clean(doc)

@api.delete("/resources/{rid}")
async def delete_resource(rid: str, user=Depends(current_user)):
    res = await db.resources.find_one({"id": rid}, {"_id": 0})
    if not res:
        raise HTTPException(404, "Recurso no encontrado")
    if res.get("owner_id") != user["id"]:
        raise HTTPException(403, "Solo el autor puede eliminar el recurso")
    await db.resources.delete_one({"id": rid})
    return {"ok": True}

@api.get("/search")
async def search(q: str = "", user=Depends(current_user)):
    q = (q or "").strip()
    if not q:
        return {"people": [], "subjects": [], "questions": [], "resources": []}
    rx = {"$regex": q, "$options": "i"}
    people = await db.users.find(
        {"$or": [{"name": rx}, {"username": rx}, {"program": rx}]},
        {"_id": 0, "password": 0},
    ).limit(15).to_list(15)
    subjects = await db.subjects.find(
        {"$or": [{"name": rx}, {"code": rx}, {"professor": rx}, {"program": rx}]},
        {"_id": 0},
    ).limit(15).to_list(15)
    questions = await db.questions.find(
        {"$or": [{"title": rx}, {"description": rx}, {"subject": rx}]},
        {"_id": 0},
    ).limit(15).to_list(15)
    resources = await db.resources.find(
        {"$or": [{"title": rx}, {"description": rx}]},
        {"_id": 0},
    ).limit(15).to_list(15)
    return {
        "people": [public_user(p) for p in people],
        "subjects": subjects,
        "questions": questions,
        "resources": resources,
    }



app.include_router(api)
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def seed():
    try:
        logging.info("File storage ready: MongoDB GridFS bucket uao_files")
    except Exception as exc:
        logging.warning("File storage check deferred: %s", exc)
    try:
        await db.users.create_index(
            "username",
            unique=True,
            name="uq_users_username",
            partialFilterExpression={"username": {"$gt": ""}},
        )
    except Exception as exc:
        logging.warning("Username index deferred: %s", exc)
    if await db.subjects.count_documents({}) == 0:
        await db.subjects.insert_many([{**x, "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()} for x in DEMO_SUBJECTS])
    if await db.tasks.count_documents({}) == 0:
        subjects = await db.subjects.find({}, {"_id": 0}).to_list(2)
        if subjects:
            await db.tasks.insert_many([
                {"id": "task-demo-1", "subject_id": subjects[0]["id"], "title": "Taller de derivadas", "description": "Resuelve los ejercicios 1 al 8 y explica el procedimiento de cada respuesta.", "due_date": "2026-04-12", "due_time": "23:59", "materials": [], "author": "Laura Gómez", "author_id": "demo-monitor", "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": "task-demo-2", "subject_id": subjects[0]["id"], "title": "Lectura: aplicaciones del cálculo", "description": "Lee el material y entrega una reflexión breve sobre una aplicación en tu programa.", "due_date": "2026-04-19", "due_time": "18:00", "materials": [], "author": "Laura Gómez", "author_id": "demo-monitor", "created_at": datetime.now(timezone.utc).isoformat()},
            ])
    await db.tasks.update_many({"author_id": "demo-professor"}, {"$set": {"author_id": "demo-monitor", "author": "Laura Gómez"}})
    # Seed advisories linked to demo advisor for a real end-to-end flow
    demo_advisor = await db.users.find_one({"email": "monitor@uao.edu.co"})
    if not demo_advisor:
        demo_advisor = {"id": "demo-monitor", "name": "Laura Gómez", "username": "laura.g", "email": "monitor@uao.edu.co", "password": pwd.hash("UAOdemo2026!"), "role": "monitor", "program": "Ingeniería Informática", "semester": None, "bio": "Monitora de Cálculo y Programación.", "rating": 4.9, "rating_count": 32}
        await db.users.insert_one(demo_advisor)
    if await db.advisories.count_documents({}) == 0:
        await db.advisories.insert_many([
            {"id": "adv-1", "advisor": demo_advisor["name"], "advisor_id": demo_advisor["id"], "role": "Monitor", "subject": "Cálculo I", "topic": "Derivadas", "date": "Martes", "time": "3:00 p. m. – 3:30 p. m.", "mode": "Virtual", "slots": 4, "place": "", "link": "https://meet.google.com/uao-calculo", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "adv-2", "advisor": "Andrés Rojas", "advisor_id": "demo-professor-rojas", "role": "Profesor", "subject": "Programación", "topic": "Estructuras de datos", "date": "Jueves", "time": "10:00 a. m. – 11:00 a. m.", "mode": "Presencial", "slots": 3, "place": "Aula 302 · Bloque D", "link": "", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ])
