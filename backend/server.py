"""Punto de entrada FastAPI de UAO Conecta.

Producción: Render (https://uao-conecta-404.onrender.com) · rutas bajo /api.
Frontend: GitHub Pages (https://ivandb344-coder.github.io/UAO_CONECTA_404).
"""
import logging

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.core.config import CORS_ORIGINS
from app.database import USE_TLS, ping_database
from app.routers import (
    advisories,
    ai,
    auth,
    chat,
    dashboard,
    files,
    integrations,
    notifications,
    profile,
    questions,
    subjects,
)
from app.services.seed import seed

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="UAO Conecta API")

# 1. Reconocer HTTPS / IP real detrás del proxy de Render.
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# 2. CORS: GitHub Pages (producción) + localhost (desarrollo) + orígenes extra de CORS_ORIGINS.
#    La autenticación usa JWT en el header Authorization (no cookies de terceros).
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "online", "message": "UAO Conecta API activa"}


# Todas las rutas de negocio viven bajo /api
api = APIRouter(prefix="/api")


@api.get("/")
async def api_root():
    return {"status": "online", "message": "UAO Conecta API activa", "timezone": "America/Bogota"}


@api.get("/health")
async def health():
    database_ok = await ping_database()
    return {"status": "ok" if database_ok else "degraded", "database": database_ok, "tls": USE_TLS}


for module in (auth, dashboard, subjects, profile, questions, advisories, chat, files, ai, notifications, integrations):
    api.include_router(module.router)

app.include_router(api)

app.add_event_handler("startup", seed)
