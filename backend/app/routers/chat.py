from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from datetime import datetime, timezone, timedelta
import uuid, json

from app.core.config import db
from app.core.security import current_user, _user_from_token
from app.models.schemas import ChatMessage, ChatMessageEdit
from app.services.users import clean
from app.services.chat import manager
from app.services.chat_rooms import DIRECT_ROOM_PREFIX, can_access_direct_room, direct_room_id
from app.services.chat_read_state import unread_chat_counts, visible_chat_rooms

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
    if room != "general":
        subject = await db.subjects.find_one({"id": room}, {"_id": 0})
        if not subject or subject.get("status") == "deleted" or subject.get("deleted_at"):
            raise HTTPException(status_code=404, detail="Esta asignatura ya no está disponible.")
        if user["id"] in (subject.get("left_members") or []):
            raise HTTPException(status_code=403, detail="Saliste de esta asignatura y ya no tienes acceso a su chat.")
        return subject
    return None


def _can_edit_message(message: dict, user: dict):
    if message.get("user_id") != user["id"] or message.get("system") or message.get("deleted"):
        raise HTTPException(status_code=403, detail="Solo puedes editar o eliminar tus propios mensajes activos.")
    try:
        created_at = datetime.fromisoformat(str(message["created_at"]).replace("Z", "+00:00"))
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=409, detail="No pudimos verificar el tiempo de este mensaje.")
    age = datetime.now(timezone.utc) - created_at.astimezone(timezone.utc)
    if age < timedelta(0) or age > timedelta(minutes=1):
        raise HTTPException(status_code=409, detail="Solo puedes editar o eliminar un mensaje durante el primer minuto.")


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
    visible = await visible_chat_rooms(user["id"])
    result = await unread_chat_counts(user["id"], visible.keys())
    total = sum(result.values())
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
    await db.notifications.update_many(
        {"user_id": user["id"], "link": f"/chat/{room}", "read": {"$ne": True}},
        {"$set": {"read": True}},
    )
    return {"ok": True, "seen_at": now}

@router.post("/chat")
async def send_chat(data: ChatMessage, user=Depends(current_user)):
    subject = await _require_room_access(data.room, user)
    if subject and subject.get("status") == "closed":
        raise HTTPException(status_code=409, detail="El profesor cerró esta asignatura. El chat está en modo de solo lectura.")
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


@router.patch("/chat/{room}/{message_id}")
async def edit_chat_message(room: str, message_id: str, data: ChatMessageEdit, user=Depends(current_user)):
    subject = await _require_room_access(room, user)
    if subject and subject.get("status") == "closed":
        raise HTTPException(status_code=409, detail="El chat de esta asignatura está cerrado.")
    message = await db.messages.find_one({"id": message_id, "room": room}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="No encontramos ese mensaje.")
    _can_edit_message(message, user)
    body = (data.body or "").strip()
    if not body and not message.get("file"):
        raise HTTPException(status_code=422, detail="El mensaje no puede quedar vacío.")
    await db.messages.update_one({"id": message_id, "room": room}, {"$set": {"body": body[:2000], "edited_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.messages.find_one({"id": message_id, "room": room}, {"_id": 0})
    await manager.broadcast(room, {"type": "message_updated", "message": clean(updated)})
    return clean(updated)


@router.delete("/chat/{room}/{message_id}")
async def delete_chat_message(room: str, message_id: str, user=Depends(current_user)):
    subject = await _require_room_access(room, user)
    if subject and subject.get("status") == "closed":
        raise HTTPException(status_code=409, detail="El chat de esta asignatura está cerrado.")
    message = await db.messages.find_one({"id": message_id, "room": room}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="No encontramos ese mensaje.")
    _can_edit_message(message, user)
    deleted_at = datetime.now(timezone.utc).isoformat()
    await db.messages.update_one(
        {"id": message_id, "room": room},
        {"$set": {"body": "", "file": None, "deleted": True, "deleted_at": deleted_at}},
    )
    await manager.broadcast(room, {"type": "message_deleted", "id": message_id, "deleted_at": deleted_at})
    return {"ok": True, "id": message_id, "deleted_at": deleted_at}

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
    try:
        await _require_room_access(room, user)
    except HTTPException as exc:
        await websocket.close(code=4403 if exc.status_code == 403 else 4404)
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
            try:
                subject = await _require_room_access(room, user)
            except HTTPException:
                await websocket.send_text(json.dumps({"type": "subject_deleted"}))
                await websocket.close(code=4404)
                return
            if subject and subject.get("status") == "closed":
                await websocket.send_text(json.dumps({"type": "subject_closed"}))
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
