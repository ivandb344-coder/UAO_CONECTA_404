from fastapi import HTTPException
from app.core.config import file_bucket

async def put_object(path, data, content_type):
    """Guarda el binario privado en MongoDB GridFS; no depende de la credencial de IA."""
    await file_bucket.upload_from_stream(
        path,
        data,
        metadata={"content_type": content_type, "storage_provider": "mongodb_gridfs"},
    )
    return {"path": path, "size": len(data)}

async def get_object(path):
    """Lee el binario privado desde MongoDB GridFS."""
    try:
        stream = await file_bucket.open_download_stream_by_name(path)
    except Exception as exc:
        raise HTTPException(404, "El contenido del archivo no está disponible.") from exc
    data = await stream.read()
    metadata = stream.metadata or {}
    return data, metadata.get("content_type", "application/octet-stream")
