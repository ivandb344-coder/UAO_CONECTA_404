from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS
from app.routers import auth, dashboard, subjects, profile, questions, advisories, chat, files, ai, notifications
from app.services.seed import seed

app = FastAPI(title="UAO Conecta API")
api = APIRouter(prefix="/api")
for module in (auth, dashboard, subjects, profile, questions, advisories, chat, files, ai, notifications):
    api.include_router(module.router)
app.include_router(api)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_event_handler("startup", seed)
