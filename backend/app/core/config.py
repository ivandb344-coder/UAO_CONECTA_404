from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from passlib.context import CryptContext
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
file_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="uao_files")
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = os.environ.get("JWT_SECRET", "uao-conecta-development-secret")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

PROGRAMS = [
    {"group": "Computación y Contenidos Digitales", "name": "Ingeniería Informática"},
    {"group": "Computación y Contenidos Digitales", "name": "Ingeniería de Datos e Inteligencia Artificial"},
    {"group": "Computación y Contenidos Digitales", "name": "Ingeniería Multimedia"},
    {"group": "Automatización e Industria", "name": "Ingeniería Industrial"},
    {"group": "Automatización e Industria", "name": "Ingeniería Mecatrónica"},
    {"group": "Automatización e Industria", "name": "Ingeniería de Manufactura"},
    {"group": "Ingenierías", "name": "Ingeniería Mecánica"},
    {"group": "Ingenierías", "name": "Ingeniería Eléctrica"},
    {"group": "Ingenierías", "name": "Ingeniería Electrónica y Telecomunicaciones"},
    {"group": "Ingenierías", "name": "Ingeniería Biomédica"},
    {"group": "Ingenierías", "name": "Ingeniería Ambiental"},
]
PROGRAM_NAMES = [p["name"] for p in PROGRAMS]
ROLES = {"student", "monitor", "professor"}
LINK_PLATFORMS = {"moodle", "whatsapp", "discord", "meet", "teams", "piazza", "telegram", "email", "linkedin", "custom"}
EMAIL_TAKEN_MESSAGE = "Este correo electrónico ya está registrado. Inicia sesión con esta cuenta."
A11Y_TEXT_SIZES = {"small", "normal", "large", "xlarge"}
DEFAULT_ACCESSIBILITY = {
    "contrast": "normal",
    "text_size": "normal",
    "animations": True,
    "reduced_motion": False,
    "focus_visible": False,
    "large_controls": False,
}
DEMO_SUBJECTS = [
    {"name": "Cálculo I", "code": "MAT101", "program": "Ingeniería Informática", "semester": 1, "professor": "Dra. Laura Gómez", "color": "teal"},
    {"name": "Programación", "code": "INF201", "program": "Ingeniería Informática", "semester": 2, "professor": "Dr. Andrés Rojas", "color": "blue"},
    {"name": "Física I", "code": "FIS101", "program": "Ingeniería Mecatrónica", "semester": 1, "professor": "Dr. Carlos Méndez", "color": "red"},
    {"name": "Ingeniería de Datos", "code": "DAT301", "program": "Ingeniería de Datos e Inteligencia Artificial", "semester": 3, "professor": "Dra. Paula Salazar", "color": "teal"},
]
