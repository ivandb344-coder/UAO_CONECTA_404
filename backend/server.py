import os
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.core.config import CORS_ORIGINS
from app.routers import (
    auth, dashboard, subjects, profile, questions, 
    advisories, chat, files, ai, notifications
)
from app.services.seed import seed

app = FastAPI(title="UAO Conecta API")

# 1. Reconocer HTTPS detrás del proxy de Render
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# 2. Cookie de sesión Cross-Site para Google OAuth (entre github.io y onrender.com)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "uao_conecta_secret_key_2026_xyz"),
    same_site="none",  # Permitir cookies entre dominios distintos
    https_only=True   # Requerido por los navegadores al usar same_site="none"
)

# 3. Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Mensaje de confirmación en la raíz
@app.get("/")
def root():
    return {"status": "online", "message": "UAO Conecta API activa"}

# Agrupar rutas bajo el prefijo /api
api = APIRouter(prefix="/api")
for module in (auth, dashboard, subjects, profile, questions, advisories, chat, files, ai, notifications):
    api.include_router(module.router)

app.include_router(api)

app.add_event_handler("startup", seed)