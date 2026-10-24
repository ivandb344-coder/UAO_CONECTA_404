from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from datetime import datetime, timezone
import uuid, json

from app.core.config import db
from app.core.security import current_user, _user_from_token
from app.models.schemas import ChatMessage
from app.services.users import clean
from app.services.chat import manager
from app.services.chat_rooms import DIRECT_ROOM_PREFIX, can_access_direct_room, direct_room_id

router = APIRouter()


def _public_contact(user: dict) -> dict:
    return {key: user.get(key) for key in ("id", "name", "role", "program", "bio", "picture")}


async def _direct_conversation(room: str, user_id: str):
    if not room.startswith(DIRECT_ROOM_PREFIX):
        return None
    return await db.chat_conversations.find_one(
        {"room": room, "participants": user_id}, {"_id": 0}
    )


async def _require_room_access(room: str, user: dict):
    if room.startswith(DIRECT_ROOM_PREFIX):
        conversation = await _direct_conversation(room, user["id"])
        if not can_access_direct_room(conversation, user["id"]):
            raise HTTPException(status_code=403, detail="No tienes acceso a esta conversación privada.")
        return conversation
    return None


async def _owned_chat_file(file_info, user_id: str):
    if not isinstance(file_info, dict) or not file_info.get("storage_path"):
        return None
    file_record = await db.files.find_one(
        {"storage_path": file_info["storage_path"], "owner_id": user_id, "is_deleted": False},
        {"_id": 0},
    )
    if not file_record:
        return None
    return {
        "name": file_record.get("name") or str(file_info.get("name") or "adjunto")[:120],
        "storage_path": file_record["storage_path"],
        "content_type": file_record.get("content_type") or "application/octet-stream",
        "size": int(file_info.get("size") or 0),
    }

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
    private_rooms = {
        conversation["room"]
        for conversation in await db.chat_conversations.find(
            {"participants": user["id"]}, {"_id": 0, "room": 1}
        ).to_list(500)
    }
    result = {}
    total = 0
    for r in rooms:
        room = r["_id"]
        if room.startswith(DIRECT_ROOM_PREFIX) and room not in private_rooms:
            continue
        seen_at = seen_map.get(room)
        if not seen_at:
            unread = r["count"]
        else:
            unread = await db.messages.count_documents({"room": room, "user_id": {"$ne": user["id"]}, "created_at": {"$gt": seen_at}})
        if unread:
            result[room] = unread
            total += unread
    return {"total": total, "rooms": result}


@router.get("/chat/contacts/professors")
async def chat_professor_contacts(user=Depends(current_user)):
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Esta opción está disponible para estudiantes.")
    teachers = await db.users.find(
        {"role": "professor", "id": {"$ne": user["id"]}},
        {"_id": 0, "id": 1, "name": 1, "role": 1, "program": 1, "bio": 1, "picture": 1},
    ).sort("name", 1).to_list(100)
    return [_public_contact(teacher) for teacher in teachers]


@router.get("/chat/direct")
async def chat_direct_conversations(user=Depends(current_user)):
    conversations = await db.chat_conversations.find(
        {"participants": user["id"]}, {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    result = []
    for conversation in conversations:
        other_id = next((pid for pid in conversation.get("participants", []) if pid != user["id"]), None)
        other = await db.users.find_one(
            {"id": other_id},
            {"_id": 0, "id": 1, "name": 1, "role": 1, "program": 1, "bio": 1, "picture": 1},
        ) if other_id else None
        if not other:
            continue
        last_message = await db.messages.find_one(
            {"room": conversation["room"]}, {"_id": 0, "body": 1, "created_at": 1}, sort=[("created_at", -1)]
        )
        result.append({
            "room": conversation["room"],
            "other": _public_contact(other),
            "last_message": last_message,
            "updated_at": conversation.get("updated_at") or conversation.get("created_at"),
        })
    return result


@router.post("/chat/direct/{target_id}")
async def start_direct_conversation(target_id: str, user=Depends(current_user)):
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Solo estudiantes pueden iniciar un chat directo con un docente.")
    professor = await db.users.find_one(
        {"id": target_id, "role": "professor"},
        {"_id": 0, "id": 1, "name": 1, "role": 1, "program": 1, "bio": 1, "picture": 1},
    )
    if not professor:
        raise HTTPException(status_code=404, detail="No encontramos a ese docente.")
    room = direct_room_id(user["id"], professor["id"])
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_conversations.update_one(
        {"room": room},
        {"$setOnInsert": {
            "room": room,
            "participants": sorted((user["id"], professor["id"])),
            "student_id": user["id"],
            "professor_id": professor["id"],
            "created_at": now,
        }, "$set": {"updated_at": now}},
        upsert=True,
    )
    return {"room": room, "other": _public_contact(professor)}

@router.get("/chat/{room}")
async def chat(room: str, user=Depends(current_user)):
    await _require_room_access(room, user)
    return await db.messages.find({"room": room}, {"_id": 0}).sort("created_at", 1).to_list(200)

@router.post("/chat/{room}/seen")
async def chat_mark_seen(room: str, user=Depends(current_user)):
    await _require_room_access(room, user)
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_seen.update_one(
        {"user_id": user["id"], "room": room},
        {"$set": {"user_id": user["id"], "room": room, "seen_at": now}},
        upsert=True,
    )
    return {"ok": True, "seen_at": now}

@router.post("/chat")
async def send_chat(data: ChatMessage, user=Depends(current_user)):
    await _require_room_access(data.room, user)
    body = (data.body or "").strip()[:2000]
    file_info = await _owned_chat_file(data.file, user["id"])
    if not body and not file_info:
        raise HTTPException(status_code=422, detail="Escribe un mensaje o adjunta un archivo.")
    item = {"id": str(uuid.uuid4()), "body": body, "room": data.room, "author": user["name"], "user_id": user["id"], "role": user["role"], "created_at": datetime.now(timezone.utc).isoformat()}
    if file_info:
        item["file"] = file_info
    await db.messages.insert_one(item)
    if data.room.startswith(DIRECT_ROOM_PREFIX):
        await db.chat_conversations.update_one({"room": data.room}, {"$set": {"updated_at": item["created_at"]}})
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
    if room.startswith(DIRECT_ROOM_PREFIX):
        conversation = await _direct_conversation(room, user["id"])
        if not can_access_direct_room(conversation, user["id"]):
            await websocket.close(code=4403)
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
            if room.startswith(DIRECT_ROOM_PREFIX):
                await db.chat_conversations.update_one({"room": room}, {"$set": {"updated_at": item["created_at"]}})
            await manager.broadcast(room, {"type": "message", "message": clean(dict(item))})
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(room, websocket)
        await manager.broadcast(room, manager.presence_payload(room))
