import os
import re
import unicodedata

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
    {"group": "Ingenierías", "name": "Ingeniería Empresarial"},
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
    "sound_effects": False,
    "spoken_labels": False,
}
DEMO_SUBJECTS = [
    {"name": "Cálculo I", "code": "MAT101", "program": "Ingeniería Informática", "semester": 1, "professor": "Dra. Laura Gómez", "color": "teal"},
    {"name": "Programación", "code": "INF201", "program": "Ingeniería Informática", "semester": 2, "professor": "Dr. Andrés Rojas", "color": "blue"},
    {"name": "Física I", "code": "FIS101", "program": "Ingeniería Mecatrónica", "semester": 1, "professor": "Dr. Carlos Méndez", "color": "red"},
    {"name": "Ingeniería de Datos", "code": "DAT301", "program": "Ingeniería de Datos e Inteligencia Artificial", "semester": 3, "professor": "Dra. Paula Salazar", "color": "teal"},
]

GARBAGE_SUBJECT_PATTERNS = [
    re.compile(r"\bxxjxjxj\b"),
    re.compile(r"\bsix\s*seven\b"),
    re.compile(r"\bseven\s*six\b"),
    re.compile(r"\blorem\s*ipsum\b"),
    re.compile(r"\bhola\s*mundo\b"),
    re.compile(r"\bhello\s*world\b"),
    re.compile(r"\bsin\s*(?:nombre|titulo)\b"),
    re.compile(r"\bcualquier\s*cosa\b"),
    re.compile(r"\basdf\b|\bqwerty\b|\bzxcv\b|\bhjkl\b"),
]
_GARBAGE_SUBJECT_WORDS = {
    "xxjxjxj", "sixseven", "test", "tests", "testing", "prueba", "pruebas",
    "mock", "mocks", "basura", "relleno", "sample", "dummy", "fake", "demo",
    "asdf", "asdfg", "qwerty", "zxcv", "zxcvb", "lorem", "ipsum", "foo", "bar",
    "baz", "ejemplo", "placeholder", "temporal", "temp", "borrar", "delete",
    "none", "null", "undefined", "nan", "aaa", "bbb", "ccc", "xxx", "zzz",
    "jaja", "jeje", "xd",
}
_GARBAGE_SUBJECT_CODES = {
    "TEST", "TEST1", "TEST01", "PRUEBA", "MOCK", "DEMO", "FAKE", "DUMMY",
    "BASURA", "RELLENO", "ASDF", "QWERTY", "XXX", "XXJXJXJ", "SIX7",
    "000", "0000", "123", "1234", "12345",
}
_ALLOWED_CONSONANT_ACRONYMS = {
    "ti", "ia", "ihc", "hci", "etl", "iot", "sql", "uml", "xml", "html",
    "http", "css", "php", "tcp", "udp", "ieee", "cad", "cam", "cnc", "erp",
    "crm", "ods", "bdd", "poo", "oop", "eda", "tda",
}
_ENGLISH_NUMBER_WORDS = {
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
}


def _normalize_subject_text(value: object) -> str:
    plain = unicodedata.normalize("NFKD", str(value or ""))
    plain = "".join(ch for ch in plain if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", plain.lower()).strip()


_ROMAN_NUMERALS = {"i", "ii", "iii", "iv", "v", "vi"}


def _has_hard_gibberish(word: str) -> bool:
    if not word or word in _ROMAN_NUMERALS:
        return False
    if re.search(r"(.)\1{2,}", word):
        return True
    if re.search(r"([a-z]{1,2})\1{2,}", word):
        return True
    if re.search(r"[xzjqwk]{3,}", word):
        return True
    letters = re.sub(r"[^a-z]", "", word)
    if len(letters) >= 4 and letters not in _ALLOWED_CONSONANT_ACRONYMS:
        vowels = len(re.findall(r"[aeiou]", letters))
        if vowels == 0:
            return True
        if len(letters) >= 6 and (vowels / len(letters)) < 0.18:
            return True
        if re.search(r"[bcdfghjklmnpqrstvwxyz]{5,}", letters):
            return True
    return False


def is_garbage_free_text(value: object) -> bool:
    normalized = _normalize_subject_text(value)
    if len(normalized) < 2 or normalized.isdigit():
        return False
    if any(pattern.search(normalized) for pattern in GARBAGE_SUBJECT_PATTERNS):
        return False
    words = [w for w in normalized.split() if w]
    if not words or any(_has_hard_gibberish(w) for w in words):
        return False
    if all(w in _GARBAGE_SUBJECT_WORDS or w.isdigit() for w in words):
        return False
    if len(words) >= 2 and all(w in _ENGLISH_NUMBER_WORDS for w in words):
        return False
    return True


def is_valid_subject_name(name: object, code: object = "") -> bool:
    code_upper = str(code or "").strip().upper()
    if code_upper and (code_upper in _GARBAGE_SUBJECT_CODES or re.search(r"(.)\1{3,}", code_upper)):
        return False
    if not is_garbage_free_text(name):
        return False
    words = [w for w in _normalize_subject_text(name).split() if w]
    if any(w in _GARBAGE_SUBJECT_WORDS for w in words):
        return False
    return any(re.search(r"[a-z]{2,}", w) for w in words)


def is_valid_subject_doc(doc: object) -> bool:
    if not isinstance(doc, dict):
        return False
    if doc.get("status") == "deleted" or doc.get("deleted_at"):
        return False
    return is_valid_subject_name(doc.get("name"), doc.get("code"))
