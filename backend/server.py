import os
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import CORS_ORIGINS
from app.routers import (
    auth, dashboard, subjects, profile, questions, 
    advisories, chat, files, ai, notifications
)
from app.services.seed import seed

app = FastAPI(title="UAO Conecta API")

# 1. FIX LOGIN GOOGLE: Middleware para guardar la sesión temporal del OAuth state
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "clave_secreta_uao_conecta_2026_xyz"),
    https_only=True,
    same_site="lax"
)

# 2. Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# 3. FIX 404 EN LA RAÍZ: Muestra un mensaje en lugar de 404 al entrar a la URL base
@app.get("/")
def root():
    return {"status": "online", "message": "UAO Conecta API activa"}

# 4. Modulos y prefijos de la API
api = APIRouter(prefix="/api")
for module in (auth, dashboard, subjects, profile, questions, advisories, chat, files, ai, notifications):
    api.include_router(module.router)

app.include_router(api)

app.add_event_handler("startup", seed)