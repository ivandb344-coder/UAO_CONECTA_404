from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from passlib.context import CryptContext
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import os, uuid, jwt, logging, requests

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = os.environ.get("JWT_SECRET", "uao-conecta-development-secret")
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
storage_key = None

def init_storage(force=False):
    global storage_key
    if storage_key and not force:
        return storage_key
    response = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]}, timeout=30)
    response.raise_for_status()
    storage_key = response.json()["storage_key"]
    return storage_key

def put_object(path, data, content_type):
    key = init_storage()
    response = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    response.raise_for_status()
    return response.json()

def get_object(path):
    key = init_storage()
    response = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if response.status_code == 404:
        key = init_storage(True)
        response = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    response.raise_for_status()
    return response.content, response.headers.get("Content-Type", "application/octet-stream")

app = FastAPI(title="UAO Conecta API")
api = APIRouter(prefix="/api")

PROGRAMS = ["Ingeniería Informática", "Ingeniería de Datos e Inteligencia Artificial", "Ingeniería Multimedia", "Ingeniería Industrial", "Ingeniería Mecatrónica", "Ingeniería de Manufactura", "Ingeniería Mecánica", "Ingeniería Eléctrica", "Ingeniería Electrónica y Telecomunicaciones", "Ingeniería Biomédica", "Ingeniería Ambiental"]
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
    return {k: u.get(k) for k in ["id", "name", "username", "email", "role", "program", "semester", "bio", "rating", "rating_count"]}

def clean(doc):
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc

# ---------- Routes ----------
@api.get("/")
async def root():
    return {"message": "UAO Conecta API activa", "timezone": "America/Bogota"}

@api.post("/auth/register")
async def register(data: Register):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(409, "Este correo ya está registrado")
    user = {"id": str(uuid.uuid4()), **data.model_dump(exclude={"password"}), "password": pwd.hash(data.password), "bio": "Perfil académico en construcción.", "rating": 0, "rating_count": 0, "created_at": datetime.now(timezone.utc).isoformat()}
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

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return public_user(user)

@api.get("/programs")
async def programs():
    return [{"name": p, "group": "Ingenierías" if "Ingeniería" in p else "Programas"} for p in PROGRAMS]

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
async def create_subject(data: dict, user=Depends(current_user)):
    if user["role"] not in ["professor", "monitor"]:
        raise HTTPException(403, "Solo profesores y monitores pueden crear asignaturas")
    doc = {"id": str(uuid.uuid4()), **data, "owner_id": user["id"], "professor": user["name"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.subjects.insert_one(doc)
    return clean(doc)

@api.get("/subjects/{subject_id}/tasks")
async def subject_tasks(subject_id: str, user=Depends(current_user)):
    tasks = await db.tasks.find({"subject_id": subject_id}, {"_id": 0}).sort("due_date", 1).to_list(100)
    for task in tasks:
        task["submission"] = await db.submissions.find_one({"task_id": task["id"], "student_id": user["id"]}, {"_id": 0})
    return tasks

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
    submission = {"id": str(uuid.uuid4()), "task_id": task_id, "student_id": user["id"], "student": user["name"], **data.model_dump(), "status": "Entregada", "submitted_at": datetime.now(timezone.utc).isoformat(), "feedback": "", "grade": None}
    await db.submissions.update_one({"task_id": task_id, "student_id": user["id"]}, {"$set": submission}, upsert=True)
    return clean(submission)

@api.patch("/submissions/{submission_id}/feedback")
async def give_feedback(submission_id: str, data: FeedbackCreate, user=Depends(current_user)):
    if user["role"] not in ["professor", "monitor"]:
        raise HTTPException(403, "Solo profesores y monitores pueden revisar entregas")
    result = await db.submissions.update_one({"id": submission_id}, {"$set": {**data.model_dump(), "reviewed_at": datetime.now(timezone.utc).isoformat()}})
    if not result.matched_count:
        raise HTTPException(404, "Entrega no encontrada")
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
    return {"ok": True, "status": data.status}

# ---------- Chat ----------
@api.get("/chat/{room}")
async def chat(room: str, user=Depends(current_user)):
    return await db.messages.find({"room": room}, {"_id": 0}).sort("created_at", 1).to_list(100)

@api.post("/chat")
async def send_chat(data: ChatMessage, user=Depends(current_user)):
    item = {"id": str(uuid.uuid4()), "body": data.body, "room": data.room, "author": user["name"], "user_id": user["id"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.messages.insert_one(item)
    return clean(item)

# ---------- Files ----------
@api.post("/files")
async def upload(file: UploadFile = File(...), user=Depends(current_user)):
    ext = Path(file.filename).suffix.lower() or ".bin"
    storage_path = f"uao-conecta/uploads/{user['id']}/{uuid.uuid4()}{ext}"
    result = put_object(storage_path, await file.read(), file.content_type or "application/octet-stream")
    item = {"id": str(uuid.uuid4()), "name": file.filename, "storage_path": result["path"], "content_type": file.content_type, "owner_id": user["id"], "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.files.insert_one(item)
    return clean(item)

@api.get("/files/{path:path}")
async def get_file(path: str, user=Depends(current_user)):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Archivo no encontrado")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type") or content_type)

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

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def seed():
    try:
        init_storage()
    except Exception as exc:
        logging.warning("Storage init deferred: %s", exc)
    if await db.subjects.count_documents({}) == 0:
        await db.subjects.insert_many([{**x, "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()} for x in DEMO_SUBJECTS])
    if await db.tasks.count_documents({}) == 0:
        subjects = await db.subjects.find({}, {"_id": 0}).to_list(2)
        if subjects:
            await db.tasks.insert_many([
                {"id": "task-demo-1", "subject_id": subjects[0]["id"], "title": "Taller de derivadas", "description": "Resuelve los ejercicios 1 al 8 y explica el procedimiento de cada respuesta.", "due_date": "2026-04-12", "due_time": "23:59", "materials": [], "author": "Dra. Laura Gómez", "author_id": "demo-professor", "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": "task-demo-2", "subject_id": subjects[0]["id"], "title": "Lectura: aplicaciones del cálculo", "description": "Lee el material y entrega una reflexión breve sobre una aplicación en tu programa.", "due_date": "2026-04-19", "due_time": "18:00", "materials": [], "author": "Dra. Laura Gómez", "author_id": "demo-professor", "created_at": datetime.now(timezone.utc).isoformat()},
            ])
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
