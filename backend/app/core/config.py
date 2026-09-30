import os
from pathlib import Path
import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from passlib.context import CryptContext

# Apunta directamente a la carpeta backend donde está guardado el .env
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)
else:
    load_dotenv()

# Lee la URL de MongoDB desde las variables cargadas
mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGO_URL") or "mongodb://localhost:27017"
db_name = os.getenv("DB_NAME", "uao_conecta")

# Conexión a MongoDB usando certifi
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[db_name]

file_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="uao_files")
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = os.environ.get("JWT_SECRET", "uao-conecta-development-secret")

# Limpieza estricta de CORS_ORIGINS
raw_origins = os.environ.get("CORS_ORIGINS", "*")
CORS_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

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