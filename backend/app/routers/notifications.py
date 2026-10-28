from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import db
from app.core.security import current_user
from app.services.chat_read_state import incoming_message_filter, message_is_read, unread_chat_counts, visible_chat_rooms

router = APIRouter()

@router.get("/notifications")
async def list_notifications(user=Depends(current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    visible_rooms = await visible_chat_rooms(user["id"])
    seen_docs = await db.chat_seen.find({"user_id": user["id"]}, {"_id": 0, "room": 1, "seen_at": 1}).to_list(500)
    seen_at = {item["room"]: item.get("seen_at") for item in seen_docs}
    messages = await db.messages.find(
        incoming_message_filter(user["id"], visible_rooms.keys()),
        {"_id": 0, "id": 1, "room": 1, "body": 1, "author": 1, "file": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(100)
    message_items = [{
        "id": f"chatmsg:{message['id']}",
        "kind": "chat_message",
        "title": f"Mensaje de {message.get('author') or 'otra persona'} · {visible_rooms.get(message['room'], 'Chat')}",
        "body": (message.get("body") or "Compartió un archivo.")[:240],
        "created_at": message.get("created_at"),
        "read": message_is_read(message.get("created_at"), seen_at.get(message["room"])),
        "link": f"/chat/{message['room']}",
    } for message in messages]
    combined = sorted([*items, *message_items], key=lambda item: item.get("created_at") or "", reverse=True)[:200]
    unread_messages = sum(unread_chat_counts(user["id"], visible_rooms.keys()).values())
    unread = sum(1 for item in items if not item.get("read")) + unread_messages
    return {"unread": unread, "items": combined}

@router.post("/notifications/{nid}/read")
async def read_notification(nid: str, user=Depends(current_user)):
    if nid.startswith("chatmsg:"):
        message_id = nid.split(":", 1)[1]
        message = await db.messages.find_one(
            {"id": message_id, **incoming_message_filter(user["id"], (await visible_chat_rooms(user["id"])).keys())},
            {"_id": 0, "room": 1, "created_at": 1},
        )
        if not message:
            raise HTTPException(404, "Ese mensaje ya no está disponible.")
        await db.chat_seen.update_one(
            {"user_id": user["id"], "room": message["room"]},
            {"$set": {"user_id": user["id"], "room": message["room"], "seen_at": message["created_at"]}},
            upsert=True,
        )
        return {"ok": True}
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

@router.post("/notifications/read-all")
async def read_all_notifications(user=Depends(current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": {"$ne": True}}, {"$set": {"read": True}})
    visible_rooms = await visible_chat_rooms(user["id"])
    now = datetime.now(timezone.utc).isoformat()
    for room in visible_rooms:
        await db.chat_seen.update_one(
            {"user_id": user["id"], "room": room},
            {"$set": {"user_id": user["id"], "room": room, "seen_at": now}},
            upsert=True,
        )
    return {"ok": True}
