from app.core.config import db

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
