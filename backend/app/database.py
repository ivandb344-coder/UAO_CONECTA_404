"""Conexión centralizada y asíncrona (Motor) a MongoDB.

- Local / Emergent: MongoDB sin TLS (``mongodb://localhost:27017``).
- Producción (Render): MongoDB Atlas (``mongodb+srv://...``) con TLS validado mediante ``certifi``.

Variables de entorno soportadas (en orden de prioridad):
``MONGODB_URL`` → ``MONGO_URI`` → ``MONGO_URL``. Base de datos: ``DB_NAME`` (por defecto ``uao_conecta``).
"""
import logging
import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket

logger = logging.getLogger(__name__)

# backend/.env (solo existe en desarrollo; en Render las variables vienen del panel)
BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_DIR / ".env"
if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)
else:
    load_dotenv()

LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "mongo", "mongodb"}


def _mongo_url() -> str:
    for key in ("MONGODB_URL", "MONGODB_URI", "MONGO_URI", "MONGO_URL"):
        value = (os.getenv(key) or "").strip().strip('"').strip("'")
        if value:
            return value
    raise RuntimeError(
        "No se encontró la cadena de conexión de MongoDB. Define MONGODB_URL, MONGO_URI o MONGO_URL."
    )


def _needs_tls(url: str) -> bool:
    """TLS solo cuando la conexión lo requiere (Atlas / servidores remotos).

    Forzar ``tlsCAFile`` contra un MongoDB local sin TLS rompe el handshake, y omitirlo
    contra Atlas en Render provoca errores de certificado. Por eso se decide según la URL.
    """
    parsed = urlparse(url)
    query = {k.lower(): v for k, v in parse_qs(parsed.query).items()}
    for flag in ("tls", "ssl"):
        if flag in query:
            return query[flag][0].strip().lower() == "true"
    if parsed.scheme == "mongodb+srv":
        return True  # Atlas: SRV implica TLS
    hosts = [h.rsplit(":", 1)[0].strip("[]").lower() for h in (parsed.netloc.split("@")[-1]).split(",") if h]
    return any(h not in LOCAL_HOSTS for h in hosts)


MONGO_URL = _mongo_url()
DB_NAME = (os.getenv("DB_NAME") or "uao_conecta").strip().strip('"').strip("'")
USE_TLS = _needs_tls(MONGO_URL)

_client_options = {
    "serverSelectionTimeoutMS": int(os.getenv("MONGO_TIMEOUT_MS", "15000")),
    "appname": "uao-conecta-api",
}
if USE_TLS:
    _client_options["tlsCAFile"] = certifi.where()

client = AsyncIOMotorClient(MONGO_URL, **_client_options)
db = client[DB_NAME]
file_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="uao_files")

logger.info("MongoDB configurado (db=%s, tls=%s)", DB_NAME, USE_TLS)


async def ping_database() -> bool:
    try:
        await client.admin.command("ping")
        return True
    except Exception as exc:  # pragma: no cover - diagnóstico
        logger.error("MongoDB no responde: %s", exc)
        return False


__all__ = ["client", "db", "file_bucket", "ping_database", "DB_NAME", "USE_TLS"]
