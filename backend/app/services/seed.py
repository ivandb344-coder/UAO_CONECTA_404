from datetime import datetime, timezone
import uuid, logging
from app.core.config import db, pwd, DEMO_SUBJECTS, DEFAULT_ACCESSIBILITY

OWNER_FIELDS = {
    "subjects": ["owner_id"], "tasks": ["author_id"], "submissions": ["student_id"], "questions": ["author_id"],
    "messages": ["user_id"], "files": ["owner_id"], "bookings": ["user_id", "advisor_id"], "advisories": ["advisor_id"],
    "resources": ["owner_id"], "notifications": ["user_id"], "saved": ["user_id"], "chat_seen": ["user_id"], "answer_ratings": ["user_id"],
}

async def merge_duplicate_emails():
    """Un correo = una cuenta. Conserva la cuenta usada (último login / más antigua) y reasigna el contenido de las duplicadas."""
    pipeline = [{"$group": {"_id": {"$toLower": "$email"}, "n": {"$sum": 1}, "ids": {"$push": "$id"}}}, {"$match": {"n": {"$gt": 1}}}]
    for group in await db.users.aggregate(pipeline).to_list(500):
        users = await db.users.find({"id": {"$in": group["ids"]}}, {"_id": 0}).to_list(50)
        users.sort(key=lambda u: u.get("created_at") or "")
        users.sort(key=lambda u: u.get("last_login") or "", reverse=True)
        keep, duplicates = users[0], users[1:]
        for dup in duplicates:
            for collection, fields in OWNER_FIELDS.items():
                for field in fields:
                    await db[collection].update_many({field: dup["id"]}, {"$set": {field: keep["id"]}})
            await db.subjects.update_many({"members": dup["id"]}, {"$addToSet": {"members": keep["id"]}})
            await db.subjects.update_many({"members": dup["id"]}, {"$pull": {"members": dup["id"]}})
            await db.users.delete_one({"id": dup["id"]})
            logging.warning("Cuenta duplicada fusionada: %s -> %s (%s)", dup["id"], keep["id"], group["_id"])
        await db.users.update_one({"id": keep["id"]}, {"$set": {"email": group["_id"]}})

async def migrate_legacy_users():
    """Normaliza usuarios creados por versiones anteriores del backend.

    - Asigna el UUID ``id`` (lo usa ``current_user``) a cuentas que solo tenían el ``_id`` de Mongo.
    - Convierte fechas BSON (datetime) a ISO 8601 para mantener un único formato.
    - Completa campos por defecto usados por el frontend.
    """
    migrated = 0
    async for u in db.users.find({"$or": [{"id": {"$exists": False}}, {"id": None}, {"id": ""}]}, {"_id": 1}):
        await db.users.update_one({"_id": u["_id"]}, {"$set": {"id": str(uuid.uuid4())}})
        migrated += 1
    for field in ("created_at", "last_login", "updated_at"):
        async for u in db.users.find({field: {"$type": "date"}}, {"_id": 1, field: 1}):
            value = u[field]
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            await db.users.update_one({"_id": u["_id"]}, {"$set": {field: value.isoformat()}})
    await db.users.update_many({"rating": {"$exists": False}}, {"$set": {"rating": 0, "rating_count": 0}})
    await db.users.update_many({"links": {"$exists": False}}, {"$set": {"links": []}})
    if migrated:
        logging.warning("Usuarios heredados migrados a id UUID: %s", migrated)


async def seed_hub_accounts():
    """Cuentas demo del Hub: una docente de la lista blanca y un estudiante institucional."""
    now = datetime.now(timezone.utc).isoformat()
    base = {"bio": "", "phone": "", "contact_info": "", "academic_info": "", "picture": None, "rating": 0, "rating_count": 0,
            "links": [], "profile_completed": True, "preferences": {"accessibility": dict(DEFAULT_ACCESSIBILITY)},
            "auth_provider": "password", "created_at": now, "last_login": now}
    accounts = [
        {"id": "demo-professor-castillo", "name": "Paola Andrea Castillo", "username": "pacastillo", "email": "pacastillo@uao.edu.co",
         "role": "professor", "program": "Ingeniería Informática", "semester": None, "bio": "Docente de Interacción Humano-Computador · Facultad de Ingeniería."},
        {"id": "demo-student-hub", "name": "Daniel Rodríguez", "username": "daniel.r", "email": "estudiante.demo@uao.edu.co",
         "role": "student", "program": "Ingeniería Informática", "semester": 3, "bio": "Estudiante de tercer semestre. Busco grupo para el proyecto integrador."},
    ]
    for account in accounts:
        if await db.users.find_one({"email": account["email"]}, {"_id": 0, "id": 1}):
            continue
        await db.users.insert_one({**base, **account, "password": pwd.hash("UAOdemo2026!")})
        logging.info("Cuenta demo del Hub creada: %s", account["email"])


async def seed():
    try:
        await _seed()
    except Exception as exc:
        # La API debe arrancar aunque MongoDB tarde en responder; /api/health reporta el estado.
        logging.error("Seed/migración inicial no completada: %s", exc)


async def _seed():
    try:
        await migrate_legacy_users()
    except Exception as exc:
        logging.warning("Migración de usuarios diferida: %s", exc)
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
    try:
        await merge_duplicate_emails()
        await db.users.create_index("email", unique=True, name="uq_users_email")
    except Exception as exc:
        logging.warning("Email index deferred: %s", exc)
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
    await seed_hub_accounts()
    if await db.advisories.count_documents({}) == 0:
        await db.advisories.insert_many([
            {"id": "adv-1", "advisor": demo_advisor["name"], "advisor_id": demo_advisor["id"], "role": "Monitor", "subject": "Cálculo I", "topic": "Derivadas", "date": "Martes", "time": "3:00 p. m. – 3:30 p. m.", "mode": "Virtual", "slots": 4, "place": "", "link": "https://meet.google.com/uao-calculo", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "adv-2", "advisor": "Andrés Rojas", "advisor_id": "demo-professor-rojas", "role": "Profesor", "subject": "Programación", "topic": "Estructuras de datos", "date": "Jueves", "time": "10:00 a. m. – 11:00 a. m.", "mode": "Presencial", "slots": 3, "place": "Aula 302 · Bloque D", "link": "", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ])
