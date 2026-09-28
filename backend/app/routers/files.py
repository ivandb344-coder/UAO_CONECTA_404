from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response
from pathlib import Path
from datetime import datetime, timezone
import uuid

from app.core.config import db
from app.core.security import current_user
from app.core.storage import put_object, get_object
from app.services.users import clean
from app.services.files import _file_is_authorized

router = APIRouter()

@router.post("/files")
async def upload(file: UploadFile = File(...), user=Depends(current_user)):
    ext = Path(file.filename).suffix.lower() or ".bin"
    storage_path = f"uao-conecta/uploads/{user['id']}/{uuid.uuid4()}{ext}"
    result = await put_object(storage_path, await file.read(), file.content_type or "application/octet-stream")
    item = {"id": str(uuid.uuid4()), "name": file.filename, "storage_path": result["path"], "content_type": file.content_type, "owner_id": user["id"], "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.files.insert_one(item)
    return clean(item)

@router.get("/files/{path:path}")
async def get_file(path: str, user=Depends(current_user)):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Archivo no encontrado")
    if not await _file_is_authorized(record, user):
        raise HTTPException(403, "No tienes permisos para abrir este archivo.")
    data, content_type = await get_object(path)
    filename = Path(record.get("name") or "archivo").name.replace('"', "")
    return Response(
        content=data,
        media_type=record.get("content_type") or content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"', "Access-Control-Expose-Headers": "Content-Disposition"},
    )
