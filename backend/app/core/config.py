import os

from passlib.context import CryptContext

# La conexión a MongoDB (y la carga de backend/.env) vive en app/database.py.
# Se reexporta aquí para mantener compatibilidad con `from app.core.config import db`.
from app.database import client, db, file_bucket  # noqa: F401

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = os.environ.get("JWT_SECRET", "uao-conecta-development-secret")

# URL pública del frontend (GitHub Pages). Se usa en enlaces de correo y como destino por defecto de OAuth.
FRONTEND_URL = (os.environ.get("FRONTEND_URL") or "https://ivandb344-coder.github.io/UAO_CONECTA_404").strip().rstrip("/")

# CORS: orígenes explícitos requeridos + los definidos en CORS_ORIGINS (separados por coma).
# Un origen es esquema + dominio (sin ruta): GitHub Pages envía "https://ivandb344-coder.github.io".
DEFAULT_CORS_ORIGINS = ["https://ivandb344-coder.github.io", "http://localhost:3000"]
_extra_origins = [o.strip().rstrip("/") for o in os.environ.get("CORS_ORIGINS", "").split(",")]
CORS_ORIGINS = list(dict.fromkeys(DEFAULT_CORS_ORIGINS + [o for o in _extra_origins if o and o != "*"]))

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