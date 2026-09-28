from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from app.core.config import db, PROGRAM_NAMES
from app.core.security import current_user
from app.models.schemas import TaskCreate, SubmissionCreate, FeedbackCreate, SubjectCreate, SubjectJoin, ResourceCreate
from app.services.users import clean, _url_ok
from app.services.notifications import _create_notification
from app.services.files import _file_meta, _can_review_task, _reviewable_tasks

router = APIRouter()

@router.get("/subjects")
async def subjects(user=Depends(current_user)):
    return await db.subjects.find({}, {"_id": 0}).to_list(100)

@router.post("/subjects")
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

@router.post("/subjects/join")
async def join_subject(data: SubjectJoin, user=Depends(current_user)):
    code = data.code.strip().upper()
    subject = await db.subjects.find_one({"access_code": code}, {"_id": 0})
    if not subject:
        raise HTTPException(404, "No encontramos una asignatura con ese código de unión.")
    await db.subjects.update_one({"id": subject["id"]}, {"$addToSet": {"members": user["id"]}})
    subject["members"] = list({*(subject.get("members") or []), user["id"]})
    return subject

@router.get("/subjects/{subject_id}/tasks")
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

@router.get("/submissions/incoming")
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

@router.post("/subjects/{subject_id}/tasks")
async def create_task(subject_id: str, data: TaskCreate, user=Depends(current_user)):
    if user["role"] not in ["professor", "monitor"]:
        raise HTTPException(403, "Solo profesores y monitores pueden crear tareas")
    if not await db.subjects.find_one({"id": subject_id}):
        raise HTTPException(404, "Asignatura no encontrada")
    task = {"id": str(uuid.uuid4()), "subject_id": subject_id, **data.model_dump(), "author": user["name"], "author_id": user["id"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.tasks.insert_one(task)
    return clean(task)

@router.post("/tasks/{task_id}/submissions")
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

@router.patch("/submissions/{submission_id}/feedback")
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

@router.get("/subjects/{sid}/resources")
async def list_resources(sid: str, user=Depends(current_user)):
    return await db.resources.find({"subject_id": sid}, {"_id": 0}).sort("created_at", -1).to_list(200)

@router.post("/subjects/{sid}/resources")
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

@router.delete("/resources/{rid}")
async def delete_resource(rid: str, user=Depends(current_user)):
    res = await db.resources.find_one({"id": rid}, {"_id": 0})
    if not res:
        raise HTTPException(404, "Recurso no encontrado")
    if res.get("owner_id") != user["id"]:
        raise HTTPException(403, "Solo el autor puede eliminar el recurso")
    await db.resources.delete_one({"id": rid})
    return {"ok": True}
