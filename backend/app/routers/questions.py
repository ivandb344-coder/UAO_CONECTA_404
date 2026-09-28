from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from app.core.config import db
from app.core.security import current_user
from app.models.schemas import QuestionCreate, AnswerCreate, AnswerRatingCreate
from app.services.users import clean

router = APIRouter()

@router.get("/questions")
async def questions(user=Depends(current_user)):
    return await db.questions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

@router.post("/questions")
async def create_question(data: QuestionCreate, user=Depends(current_user)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "author": None if data.anonymous else user["name"], "author_id": user["id"], "answers": [], "accepted_id": None, "status": "Sin respuesta", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.questions.insert_one(doc)
    return clean(doc)

@router.get("/questions/{qid}")
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

@router.post("/questions/{qid}/answers")
async def answer(qid: str, data: AnswerCreate, user=Depends(current_user)):
    ans = {"id": str(uuid.uuid4()), "body": data.body, "author": user["name"], "author_id": user["id"], "role": user["role"], "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.questions.update_one({"id": qid}, {"$push": {"answers": ans}, "$set": {"status": "En discusión"}})
    if not result.matched_count:
        raise HTTPException(404, "Duda no encontrada")
    return ans

@router.post("/answers/{answer_id}/rating")
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

@router.post("/questions/{qid}/accept/{aid}")
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
