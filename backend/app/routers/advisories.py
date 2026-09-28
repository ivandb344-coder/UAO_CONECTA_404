from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from app.core.config import db
from app.core.security import current_user
from app.models.schemas import BookingCreate, BookingStatus, AdvisoryCreate, AdvisoryPatch
from app.services.users import clean
from app.services.notifications import _create_notification

router = APIRouter()

@router.get("/advisories")
async def advisories(mine: bool = False, user=Depends(current_user)):
    filt = {"advisor_id": user["id"]} if mine else {}
    docs = await db.advisories.find(filt, {"_id": 0}).sort("created_at", -1).to_list(200)
    for d in docs:
        d["booked"] = await db.bookings.count_documents({"advisory_id": d["id"], "status": {"$in": ["Pendiente", "Aceptada", "Completada"]}})
        d["available"] = max((d.get("slots", 0) or 0) - d["booked"], 0)
    return docs

@router.post("/advisories")
async def create_advisory(data: AdvisoryCreate, user=Depends(current_user)):
    if user["role"] == "student":
        raise HTTPException(403, "Solo monitores y profesores pueden publicar disponibilidad")
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "advisor": user["name"], "advisor_id": user["id"], "role": "Monitor" if user["role"] == "monitor" else "Profesor", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.advisories.insert_one(doc)
    return clean(doc)

@router.patch("/advisories/{aid}")
async def update_advisory(aid: str, data: AdvisoryPatch, user=Depends(current_user)):
    adv = await db.advisories.find_one({"id": aid}, {"_id": 0})
    if not adv:
        raise HTTPException(404, "Asesoría no encontrada")
    if adv.get("advisor_id") != user["id"]:
        raise HTTPException(403, "Solo puedes editar tu propia agenda")
    patch = {k: v for k, v in data.model_dump().items() if v is not None}
    if patch:
        await db.advisories.update_one({"id": aid}, {"$set": patch})
    return await db.advisories.find_one({"id": aid}, {"_id": 0})

@router.delete("/advisories/{aid}")
async def delete_advisory(aid: str, user=Depends(current_user)):
    adv = await db.advisories.find_one({"id": aid}, {"_id": 0})
    if not adv:
        raise HTTPException(404, "Asesoría no encontrada")
    if adv.get("advisor_id") != user["id"]:
        raise HTTPException(403, "Solo puedes eliminar tu propia agenda")
    await db.advisories.delete_one({"id": aid})
    return {"ok": True}

@router.post("/bookings")
async def create_booking(data: BookingCreate, user=Depends(current_user)):
    adv = await db.advisories.find_one({"id": data.advisory_id}, {"_id": 0})
    if not adv:
        raise HTTPException(404, "Asesoría no encontrada")
    if not adv.get("active", True):
        raise HTTPException(409, "Esta asesoría no está disponible")
    if adv.get("advisor_id") == user["id"]:
        raise HTTPException(409, "No puedes reservar tu propia asesoría")
    dup = await db.bookings.find_one({"user_id": user["id"], "advisory_id": data.advisory_id, "status": {"$in": ["Pendiente", "Aceptada"]}})
    if dup:
        raise HTTPException(409, "Ya tienes una solicitud para este horario")
    booked = await db.bookings.count_documents({"advisory_id": data.advisory_id, "status": {"$in": ["Pendiente", "Aceptada", "Completada"]}})
    if booked >= (adv.get("slots", 0) or 0):
        raise HTTPException(409, "Cupo lleno")
    conflict = await db.bookings.find_one({"user_id": user["id"], "date": adv.get("date"), "time": adv.get("time"), "status": {"$in": ["Pendiente", "Aceptada"]}})
    if conflict:
        raise HTTPException(409, "Ya tienes una reserva en ese horario")
    item = {
        "id": str(uuid.uuid4()),
        "advisory_id": data.advisory_id,
        "advisor": adv.get("advisor"),
        "advisor_id": adv.get("advisor_id"),
        "subject": adv.get("subject"),
        "topic": adv.get("topic"),
        "date": adv.get("date"),
        "time": adv.get("time"),
        "mode": adv.get("mode"),
        "place": adv.get("place", ""),
        "link": adv.get("link", ""),
        "note": data.note,
        "user_id": user["id"],
        "student": user["name"],
        "student_program": user.get("program"),
        "status": "Pendiente",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(item)
    return clean(item)

@router.get("/bookings")
async def bookings(user=Depends(current_user)):
    return await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@router.get("/bookings/incoming")
async def incoming_bookings(user=Depends(current_user)):
    if user["role"] == "student":
        return []
    return await db.bookings.find({"advisor_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)

@router.patch("/bookings/{bid}/status")
async def update_booking_status(bid: str, data: BookingStatus, user=Depends(current_user)):
    valid = {"Pendiente", "Aceptada", "Rechazada", "Cancelada", "Completada", "No asistió"}
    if data.status not in valid:
        raise HTTPException(422, "Estado no válido")
    booking = await db.bookings.find_one({"id": bid}, {"_id": 0})
    if not booking:
        raise HTTPException(404, "Reserva no encontrada")
    # Advisor can Aceptar/Rechazar/Completar/No asistió. Student can Cancelar la suya.
    if data.status == "Cancelada":
        if booking["user_id"] != user["id"] and booking.get("advisor_id") != user["id"]:
            raise HTTPException(403, "No puedes cancelar esta reserva")
    else:
        if booking.get("advisor_id") != user["id"]:
            raise HTTPException(403, "Solo el asesor puede cambiar este estado")
    await db.bookings.update_one({"id": bid}, {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}})
    # Fan-out notifications
    subject = booking.get("subject", "")
    topic = booking.get("topic", "")
    when = f"{booking.get('date','')} · {booking.get('time','')}".strip()
    notif_map = {
        "Aceptada":   {"target": booking["user_id"],    "title": "Tu asesoría fue aceptada", "body": f"{subject} · {topic} — {when}"},
        "Rechazada":  {"target": booking["user_id"],    "title": "Tu asesoría fue rechazada", "body": f"{subject} · {topic} — {when}"},
        "Cancelada":  {"target": booking["user_id"] if booking.get("advisor_id") == user["id"] else booking.get("advisor_id"),
                       "title": "Se canceló una asesoría", "body": f"{subject} · {topic} — {when}"},
        "Completada": {"target": booking["user_id"],    "title": "Asesoría completada", "body": f"{subject} · {topic} — {when}"},
        "No asistió": {"target": booking["user_id"],    "title": "Se marcó 'No asistió'", "body": f"{subject} · {topic} — {when}"},
    }
    n = notif_map.get(data.status)
    if n and n["target"]:
        await _create_notification(n["target"], data.status.lower().replace(" ", "_"), n["title"], n["body"], "/mis-asesorias" if n["target"] == booking["user_id"] else "/asesorias")
    return {"ok": True, "status": data.status}
