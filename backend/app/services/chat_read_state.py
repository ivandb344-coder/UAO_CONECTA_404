from datetime import datetime, timezone

from app.core.config import db


async def visible_chat_rooms(user_id: str):
    """Return rooms the account can see, with a human-readable label."""
    rooms = {"general": "Comunidad UAO"}
    subjects = await db.subjects.find(
        {"status": {"$ne": "deleted"}, "deleted_at": {"$exists": False}},
        {"_id": 0, "id": 1, "name": 1, "left_members": 1},
    ).to_list(500)
    for subject in subjects:
        if user_id not in (subject.get("left_members") or []):
            rooms[subject["id"]] = subject.get("name") or "Chat de asignatura"

    conversations = await db.chat_conversations.find(
        {"participants": user_id}, {"_id": 0, "room": 1, "participants": 1}
    ).to_list(500)
    other_ids = list({participant for row in conversations for participant in row.get("participants", []) if participant != user_id})
    other_users = await db.users.find(
        {"id": {"$in": other_ids}}, {"_id": 0, "id": 1, "name": 1}
    ).to_list(500) if other_ids else []
    names = {person["id"]: person.get("name") or "Docente" for person in other_users}
    for conversation in conversations:
        other_id = next((participant for participant in conversation.get("participants", []) if participant != user_id), None)
        rooms[conversation["room"]] = f"Chat con {names.get(other_id, 'docente')}"
    return rooms


def incoming_message_filter(user_id: str, room_ids):
    return {
        "room": {"$in": list(room_ids)},
        "user_id": {"$exists": True, "$nin": [user_id, None, ""]},
        "system": {"$ne": True},
        "deleted": {"$ne": True},
    }


async def unread_chat_counts(user_id: str, room_ids):
    if not room_ids:
        return {}
    message_filter = incoming_message_filter(user_id, room_ids)
    grouped = await db.messages.aggregate([
        {"$match": message_filter},
        {"$group": {"_id": "$room", "count": {"$sum": 1}}},
    ]).to_list(500)
    seen_docs = await db.chat_seen.find(
        {"user_id": user_id}, {"_id": 0, "room": 1, "seen_at": 1}
    ).to_list(500)
    seen = {item["room"]: item.get("seen_at") for item in seen_docs}
    result = {}
    for item in grouped:
        room = item["_id"]
        seen_at = seen.get(room)
        if not seen_at:
            unread = item["count"]
        else:
            unread = await db.messages.count_documents({
                **message_filter,
                "room": room,
                "created_at": {"$gt": seen_at},
            })
        if unread:
            result[room] = unread
    return result


def message_is_read(created_at, seen_at):
    if not created_at or not seen_at:
        return False
    try:
        message_time = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
        seen_time = datetime.fromisoformat(str(seen_at).replace("Z", "+00:00"))
        if message_time.tzinfo is None:
            message_time = message_time.replace(tzinfo=timezone.utc)
        if seen_time.tzinfo is None:
            seen_time = seen_time.replace(tzinfo=timezone.utc)
        return message_time <= seen_time
    except (TypeError, ValueError):
        return False
