import re

from fastapi import APIRouter, HTTPException, Depends

from app.core.config import db, PROGRAMS
from app.core.security import current_user
from app.services.users import public_user
from app.services.search_match import document_matches

router = APIRouter()

@router.get("/programs")
async def programs():
    return PROGRAMS

@router.get("/dashboard")
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

@router.get("/people")
async def people(q: str = "", role: str = "", user=Depends(current_user)):
    filt = {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"username": {"$regex": q, "$options": "i"}}, {"program": {"$regex": q, "$options": "i"}}]}
    if role:
        filt["role"] = role
    return [public_user(x) for x in await db.users.find(filt, {"_id": 0, "password": 0}).to_list(50)]

@router.get("/profiles/{uid}")
async def profile(uid: str, user=Depends(current_user)):
    item = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    if not item:
        raise HTTPException(404, "Perfil no encontrado")
    return item

@router.post("/saved")
async def save(item: dict, user=Depends(current_user)):
    await db.saved.update_one({"user_id": user["id"], "item_id": item.get("item_id")}, {"$set": {**item, "user_id": user["id"]}}, upsert=True)
    return {"ok": True}

@router.get("/saved")
async def saved(user=Depends(current_user)):
    return await db.saved.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)

@router.get("/search")
async def search(q: str = "", user=Depends(current_user)):
    q = (q or "").strip()
    if not q:
        return {"people": [], "subjects": [], "questions": [], "resources": []}
    # Treat the query as text so punctuation cannot change the regex pattern.
    rx = {"$regex": re.escape(q), "$options": "i"}
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
    result = {
        "people": [public_user(p) for p in people],
        "subjects": subjects,
        "questions": questions,
        "resources": resources,
    }
    if any(result.values()):
        result["meta"] = {"mode": "exact"}
        return result

    # If an exact query finds nothing, make a bounded second pass that accepts
    # small spelling mistakes without turning every query into a broad match.
    people = [p for p in await db.users.find({}, {"_id": 0, "password": 0}).limit(150).to_list(150)
              if document_matches(q, (p.get("name"), p.get("username"), p.get("program")))][:15]
    subjects = [item for item in await db.subjects.find({}, {"_id": 0}).limit(150).to_list(150)
                if document_matches(q, (item.get("name"), item.get("code"), item.get("professor"), item.get("program")))][:15]
    questions = [item for item in await db.questions.find({}, {"_id": 0}).limit(150).to_list(150)
                 if document_matches(q, (item.get("title"), item.get("description"), item.get("subject")))][:15]
    resources = [item for item in await db.resources.find({}, {"_id": 0}).limit(150).to_list(150)
                 if document_matches(q, (item.get("title"), item.get("description")))][:15]
    return {
        "people": [public_user(p) for p in people],
        "subjects": subjects,
        "questions": questions,
        "resources": resources,
        "meta": {"mode": "approximate"},
    }
