from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pathlib import Path
from datetime import datetime, timezone
import uuid

from app.core.config import db, PROGRAM_NAMES, ROLES, LINK_PLATFORMS, A11Y_TEXT_SIZES, DEFAULT_ACCESSIBILITY
from app.core.institution import is_professor
from app.core.security import current_user
from app.core.storage import put_object
from app.models.schemas import ProfilePatch, LinkCreate, LinkPatch, AccessibilityPrefs
from app.services.users import public_user, _url_ok, _profile_completed

router = APIRouter()

@router.get("/profile/username-available")
async def username_available(u: str, user=Depends(current_user)):
    u = (u or "").strip().lower()
    if not u:
        return {"available": False, "reason": "El nombre de usuario es obligatorio."}
    if len(u) < 3:
        return {"available": False, "reason": "El nombre de usuario debe tener al menos 3 caracteres."}
    other = await db.users.find_one({"username": u, "id": {"$ne": user["id"]}}, {"_id": 0})
    if other:
        return {"available": False, "reason": "Este nombre de usuario ya está en uso."}
    return {"available": True}

@router.patch("/profile/me")
async def update_profile(data: ProfilePatch, user=Depends(current_user)):
    payload = data.model_dump(exclude_unset=True)
    errors = {}
    if "username" in payload:
        username = (payload["username"] or "").strip().lower()
        if not username:
            errors["username"] = "El nombre de usuario es obligatorio."
        elif len(username) < 3:
            errors["username"] = "El nombre de usuario debe tener al menos 3 caracteres."
        else:
            other = await db.users.find_one({"username": username, "id": {"$ne": user["id"]}}, {"_id": 0})
            if other:
                errors["username"] = "Este nombre de usuario ya está en uso."
        payload["username"] = username
    if "role" in payload:
        if payload["role"] not in ROLES:
            errors["role"] = "Selecciona un rol: Estudiante, Monitor o Profesor."
        elif is_professor(user.get("email")):
            payload["role"] = "professor"
        elif payload["role"] == "professor":
            # El rol docente solo se asigna desde el directorio institucional (lista blanca).
            payload["role"] = "student"
    if "program" in payload:
        if payload["program"] not in PROGRAM_NAMES:
            errors["program"] = "Selecciona tu programa académico."
    if "semester" in payload and payload["semester"] is not None:
        try:
            s = int(payload["semester"])
            if s < 1 or s > 12:
                errors["semester"] = "Selecciona un semestre entre 1 y 12."
            else:
                payload["semester"] = s
        except (TypeError, ValueError):
            errors["semester"] = "Selecciona un semestre válido."
    if "name" in payload and not (payload["name"] or "").strip():
        errors["name"] = "El nombre visible no puede quedar vacío."
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})
    merged = {**user, **payload}
    payload["profile_completed"] = _profile_completed(merged)
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$set": payload})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return public_user(updated)

@router.post("/profile/photo")
async def upload_profile_photo(file: UploadFile = File(...), user=Depends(current_user)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(422, "Solo se permiten imágenes para la foto de perfil.")
    ext = Path(file.filename).suffix.lower() or ".jpg"
    storage_path = f"uao-conecta/avatars/{user['id']}/{uuid.uuid4()}{ext}"
    content = await file.read()
    result = await put_object(storage_path, content, file.content_type or "image/jpeg")
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "name": file.filename or "foto-de-perfil",
        "storage_path": result["path"],
        "content_type": file.content_type or "image/jpeg",
        "owner_id": user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    picture_url = f"/api/files/{result['path']}"
    await db.users.update_one({"id": user["id"]}, {"$set": {"picture": picture_url}})
    return {"picture": picture_url}


@router.get("/profile/preferences")
async def get_preferences(user=Depends(current_user)):
    return public_user(user)["preferences"]

@router.patch("/profile/preferences")
async def update_preferences(data: AccessibilityPrefs, user=Depends(current_user)):
    updates = data.model_dump(exclude_unset=True)
    errors = {}
    if "contrast" in updates and updates["contrast"] not in {"normal", "high"}:
        errors["contrast"] = "Elige contraste normal o alto contraste."
    if "text_size" in updates and updates["text_size"] not in A11Y_TEXT_SIZES:
        errors["text_size"] = "Elige un tamaño de texto válido."
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})
    current = {**DEFAULT_ACCESSIBILITY, **((user.get("preferences") or {}).get("accessibility") or {})}
    current.update(updates)
    await db.users.update_one({"id": user["id"]}, {"$set": {"preferences.accessibility": current, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"accessibility": current}

@router.post("/profile/links")
async def add_link(data: LinkCreate, user=Depends(current_user)):
    platform = (data.platform or "").lower()
    if platform not in LINK_PLATFORMS:
        raise HTTPException(status_code=422, detail={"fields": {"platform": "Selecciona una plataforma válida."}})
    if not _url_ok(data.url):
        raise HTTPException(status_code=422, detail={"fields": {"url": "Ingresa una URL válida."}})
    label = (data.label or "").strip()
    if platform == "custom" and not label:
        raise HTTPException(status_code=422, detail={"fields": {"label": "Escribe un nombre para el enlace personalizado."}})
    link = {
        "id": str(uuid.uuid4()),
        "platform": platform,
        "url": data.url.strip(),
        "label": label or None,
        "icon": (data.icon or "").strip() or None,
        "visible": bool(data.visible),
    }
    await db.users.update_one({"id": user["id"]}, {"$push": {"links": link}})
    return link

@router.patch("/profile/links/{lid}")
async def edit_link(lid: str, data: LinkPatch, user=Depends(current_user)):
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "links": 1})
    links = doc.get("links") or []
    target = next((l for l in links if l["id"] == lid), None)
    if not target:
        raise HTTPException(404, "Enlace no encontrado")
    updates = data.model_dump(exclude_unset=True)
    errors = {}
    if "url" in updates and not _url_ok(updates["url"]):
        errors["url"] = "Ingresa una URL válida."
    if "platform" in updates and updates["platform"] not in LINK_PLATFORMS:
        errors["platform"] = "Selecciona una plataforma válida."
    final_platform = updates.get("platform", target.get("platform"))
    final_label = updates.get("label", target.get("label"))
    if final_platform == "custom" and not (final_label or "").strip():
        errors["label"] = "Escribe un nombre para el enlace personalizado."
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})
    target.update({k: v.strip() if isinstance(v, str) else v for k, v in updates.items() if v is not None})
    await db.users.update_one({"id": user["id"]}, {"$set": {"links": links}})
    return target

@router.delete("/profile/links/{lid}")
async def delete_link(lid: str, user=Depends(current_user)):
    await db.users.update_one({"id": user["id"]}, {"$pull": {"links": {"id": lid}}})
    return {"ok": True}
