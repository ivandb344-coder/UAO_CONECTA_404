"""Identidad institucional UAO (simulación de arrastre de datos desde Banner / directorio docente).

- Solo se admiten correos ``@uao.edu.co``.
- Los correos de la lista blanca se reconocen como docentes de la Facultad de Ingeniería.
- Cualquier otro correo institucional se reconoce como estudiante (puede activar "Modo Monitor" en la UI).
"""
from typing import Optional

ALLOWED_EMAIL_DOMAIN = "uao.edu.co"
INSTITUTIONAL_EMAIL_MESSAGE = "Solo se permiten correos institucionales @uao.edu.co."

PROFESSOR_DIRECTORY_SOURCE = "Directorio docente · Facultad de Ingeniería"
STUDENT_DIRECTORY_SOURCE = "Banner · Registro académico estudiantil"

PROFESSOR_WHITELIST = frozenset({
    "amchaurra@uao.edu.co", "aaragon@uao.edu.co", "ajrojas@uao.edu.co", "aplasso@uao.edu.co",
    "afgallego@uao.edu.co", "afrodriguezv@uao.edu.co", "afsolano@uao.edu.co", "arondon@uao.edu.co",
    "brsabogal@uao.edu.co", "capa@uao.edu.co", "cecastang@uao.edu.co", "cmartinezo@uao.edu.co",
    "ccpena@uao.edu.co", "cvroa@uao.edu.co", "dcardona@uao.edu.co", "derecalde@uao.edu.co",
    "dcrivera@uao.edu.co", "dmcfragua@uao.edu.co", "daburgos@uao.edu.co", "dfalmario@uao.edu.co",
    "dmartinez@uao.edu.co", "decampo@uao.edu.co", "eefranco@uao.edu.co", "epava@uao.edu.co",
    "eescobar@uao.edu.co", "ecquispe@uao.edu.co", "epalomino@uao.edu.co", "fcorrea@uao.edu.co",
    "ffonthal@uao.edu.co", "gacalberto@uao.edu.co", "garias@uao.edu.co", "gmedina@uao.edu.co",
    "gmaparicio@uao.edu.co", "hjsuarez@uao.edu.co", "harubio@uao.edu.co", "embarrera@uao.edu.co",
    "jquintero@uao.edu.co", "jeholguin@uao.edu.co", "jfcastillo@uao.edu.co", "jamosquera@uao.edu.co",
    "jalopez@uao.edu.co", "jemasso@uao.edu.co", "jgdavila@uao.edu.co", "jtombe@uao.edu.co",
    "jcuastumal@uao.edu.co", "jaospina@uao.edu.co", "jjcabrera@uao.edu.co", "jposada@uao.edu.co",
    "jacortes@uao.edu.co", "jramos@uao.edu.co", "jcmena@uao.edu.co", "jdpulgarin@uao.edu.co",
    "jpcorrea@uao.edu.co", "jrvidal@uao.edu.co", "jdquinteroo@uao.edu.co", "kvlozano@uao.edu.co",
    "lcvargas@uao.edu.co", "lsaavedra@uao.edu.co", "lssepulveda@uao.edu.co", "lcurbano@uao.edu.co",
    "lpena@uao.edu.co", "maapalacios@uao.edu.co", "mgordillo@uao.edu.co", "mcorrea@uao.edu.co",
    "mlpalacios@uao.edu.co", "mahidalgo@uao.edu.co", "mjnavas@uao.edu.co", "mddidyme@uao.edu.co",
    "oarboleda@uao.edu.co", "ohmondragon@uao.edu.co", "oicampo@uao.edu.co", "pacastillo@uao.edu.co",
    "pagonzalez@uao.edu.co", "rcaicedo@uao.edu.co", "rcmontero@uao.edu.co", "rsanchez@uao.edu.co",
    "rcastrillon@uao.edu.co", "rrrodriguez@uao.edu.co", "slain@uao.edu.co", "sordonez@uao.edu.co",
    "vlopezv@uao.edu.co", "vmanzi@uao.edu.co", "wagredo@uao.edu.co", "ylopez@uao.edu.co",
    "zsolarte@uao.edu.co",
})


def normalize_email(email: Optional[str]) -> str:
    return (email or "").strip().lower()


def is_institutional(email: Optional[str]) -> bool:
    value = normalize_email(email)
    return "@" in value and value.rsplit("@", 1)[1] == ALLOWED_EMAIL_DOMAIN


def is_professor(email: Optional[str]) -> bool:
    return normalize_email(email) in PROFESSOR_WHITELIST


def role_for_email(email: Optional[str]) -> str:
    return "professor" if is_professor(email) else "student"


def institutional_error(email: Optional[str]) -> Optional[str]:
    return None if is_institutional(email) else INSTITUTIONAL_EMAIL_MESSAGE


def identity_check(email: Optional[str]) -> dict:
    """Resultado de la "verificación institucional" que la UI muestra durante el login."""
    value = normalize_email(email)
    institutional = is_institutional(value)
    role = role_for_email(value) if institutional else None
    return {
        "email": value,
        "institutional": institutional,
        "role": role,
        "verified_by": None if not institutional else (PROFESSOR_DIRECTORY_SOURCE if role == "professor" else STUDENT_DIRECTORY_SOURCE),
        "message": None if institutional else INSTITUTIONAL_EMAIL_MESSAGE,
    }
