# Reexporta la conexión centralizada desde config.py
from app.core.config import db, client

__all__ = ["db", "client"]