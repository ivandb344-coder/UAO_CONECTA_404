from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from datetime import datetime, timezone
import uuid, json

from app.core.config import db
from app.core.security import current_user, _user_from_token
from app.models.schemas import ChatMessage
from app.services.users import clean
from app.services.chat import manager

router = APIRouter()

@router.get("/chat/summary")
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

@router.get("/chat/{room}")
async def chat(room: str, user=Depends(current_user)):
    return await db.messages.find({"room": room}, {"_id": 0}).sort("created_at", 1).to_list(200)

@router.post("/chat/{room}/seen")
async def chat_mark_seen(room: str, user=Depends(current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_seen.update_one(
        {"user_id": user["id"], "room": room},
        {"$set": {"user_id": user["id"], "room": room, "seen_at": now}},
        upsert=True,
    )
    return {"ok": True, "seen_at": now}

@router.post("/chat")
async def send_chat(data: ChatMessage, user=Depends(current_user)):
    item = {"id": str(uuid.uuid4()), "body": data.body, "room": data.room, "author": user["name"], "user_id": user["id"], "role": user["role"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.messages.insert_one(item)
    await manager.broadcast(data.room, {"type": "message", "message": clean(dict(item))})
    return clean(item)

@router.websocket("/ws/chat/{room}")
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
