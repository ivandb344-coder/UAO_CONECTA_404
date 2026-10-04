"""Capa de integración (MOCK) con los sistemas institucionales: Moodle, Teams y Banner.

El Hub no reemplaza estas plataformas: las unifica. Estos endpoints simulan la respuesta
de sus APIs para demostrar en la UI cómo se evita la fragmentación. No hay conexión real.
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import current_user

router = APIRouter(prefix="/integrations", tags=["Integraciones (mock)"])

BOGOTA = ZoneInfo("America/Bogota")

SYSTEMS = {
    "moodle": {"name": "Moodle", "description": "Aulas virtuales, calificaciones y entregas", "url": "https://moodle.uao.edu.co", "color": "#F98012"},
    "teams": {"name": "Microsoft Teams", "description": "Mensajes, reuniones y equipos de clase", "url": "https://teams.microsoft.com", "color": "#5B5FC7"},
    "banner": {"name": "Banner", "description": "Registro académico, matrícula y promedio", "url": "https://banner.uao.edu.co", "color": "#1E293B"},
}

# Ecosistema de herramientas complementarias, agrupadas por categoría (MOCK).
# status: "synced" (Sincronizado · Abrir) | "available" (Disponible · Conectar)
ECOSYSTEM = [
    {
        "key": "gmail",
        "name": "Gmail / Google Workspace",
        "short": "GW",
        "category": "comunicacion",
        "category_label": "Comunicación oficial",
        "description": "Correo institucional @uao.edu.co y tutorías por Google Meet.",
        "status": "synced",
        "color": "#EA4335",
        "cta": {"label": "Abrir", "action": "open", "url": "https://mail.google.com/a/uao.edu.co"},
    },
    {
        "key": "piazza",
        "name": "Piazza",
        "short": "PZ",
        "category": "foros",
        "category_label": "Foros académicos",
        "description": "Resolución de dudas, foros Q&A y colaboración con docentes.",
        "status": "available",
        "color": "#1E73BE",
        "cta": {"label": "Conectar", "action": "connect", "url": "https://piazza.com"},
    },
    {
        "key": "whatsapp",
        "name": "WhatsApp UAO",
        "short": "WA",
        "category": "soporte",
        "category_label": "Soporte & contacto directo",
        "description": "Atención inmediata, canal de avisos y grupos de estudio.",
        "status": "synced",
        "color": "#25D366",
        "cta": {"label": "Abrir", "action": "open", "url": "https://wa.me/573000000000"},
    },
]


def _synced_at() -> str:
    return datetime.now(timezone.utc).astimezone(BOGOTA).isoformat()


def _moodle(role: str, name: str) -> dict:
    if role == "professor":
        items = [
            {"label": "Entregas por calificar", "value": 14, "detail": "Taller 3 · Programación (INF201)", "kind": "action"},
            {"label": "Foro con preguntas sin responder", "value": 3, "detail": "Cálculo I (MAT101)", "kind": "warning"},
            {"label": "Próximo cierre de actividad", "value": "Vie 19 · 23:59", "detail": "Reflexión: aplicaciones del cálculo", "kind": "info"},
        ]
    else:
        items = [
            {"label": "Nuevas calificaciones subidas", "value": 2, "detail": "Cálculo I · Taller de derivadas (4.3) · Física I · Quiz 2 (3.8)", "kind": "success"},
            {"label": "Entregas próximas", "value": 3, "detail": "Programación · Taller 3 vence en 2 días", "kind": "warning"},
            {"label": "Recursos nuevos esta semana", "value": 5, "detail": "Guías y videos en Ingeniería de Datos", "kind": "info"},
        ]
    return {**SYSTEMS["moodle"], "key": "moodle", "status": "connected", "synced_at": _synced_at(), "items": items,
            "cta": {"label": "Abrir Moodle", "url": SYSTEMS["moodle"]["url"]}}


def _teams(role: str, name: str) -> dict:
    if role == "professor":
        items = [
            {"label": "Mensajes no leídos", "value": 7, "detail": "Equipo INF201 · Grupo 02 · Monitores", "kind": "action"},
            {"label": "Reunión en curso", "value": "Asesoría grupal", "detail": "Estructuras de datos · 6 asistentes", "kind": "live"},
            {"label": "Próxima reunión", "value": "Hoy 4:00 p. m.", "detail": "Comité de programa · Ingeniería Informática", "kind": "info"},
        ]
    else:
        items = [
            {"label": "Mensajes no leídos", "value": 4, "detail": "Equipo de proyecto · Canal Entrega 2", "kind": "action"},
            {"label": "Reunión de proyecto en curso", "value": "En vivo", "detail": "Sprint review · 3 compañeros conectados", "kind": "live"},
            {"label": "Clase de hoy", "value": "2:00 p. m.", "detail": "Programación · Aula virtual INF201", "kind": "info"},
        ]
    return {**SYSTEMS["teams"], "key": "teams", "status": "connected", "synced_at": _synced_at(), "items": items,
            "cta": {"label": "Abrir Teams", "url": SYSTEMS["teams"]["url"]}}


def _banner(role: str, name: str, user: dict) -> dict:
    if role == "professor":
        items = [
            {"label": "Cursos asignados 2026-2", "value": 3, "detail": "INF201 · MAT101 · DAT301", "kind": "info"},
            {"label": "Estudiantes matriculados", "value": 86, "detail": "Listas de clase sincronizadas", "kind": "success"},
            {"label": "Cierre de notas", "value": "12 jun", "detail": "Reporte final · Registro académico", "kind": "warning"},
        ]
    else:
        semester = user.get("semester") or 3
        items = [
            {"label": "Promedio acumulado", "value": "4.5", "detail": "Escala 0.0 – 5.0 · Actualizado al cierre de 2026-1", "kind": "success"},
            {"label": "Estado de matrícula", "value": "Activa", "detail": f"2026-2 · {semester}° semestre · 16 créditos", "kind": "success"},
            {"label": "Créditos aprobados", "value": "58 / 160", "detail": user.get("program") or "Ingeniería", "kind": "info"},
        ]
    return {**SYSTEMS["banner"], "key": "banner", "status": "connected", "synced_at": _synced_at(), "items": items,
            "cta": {"label": "Abrir Banner", "url": SYSTEMS["banner"]["url"]}}


def _build(system: str, user: dict) -> dict:
    role = "professor" if user.get("role") == "professor" else "student"
    name = user.get("name") or ""
    if system == "moodle":
        return _moodle(role, name)
    if system == "teams":
        return _teams(role, name)
    return _banner(role, name, user)


@router.get("/summary")
async def integrations_summary(user=Depends(current_user)):
    return {
        "mock": True,
        "hub": "Hub de Integración Estudiantil UAO",
        "sso": {"provider": "Cuenta institucional UAO", "email": user.get("email"), "status": "active"},
        "systems": [_build(key, user) for key in ("moodle", "teams", "banner")],
        "ecosystem": ECOSYSTEM,
    }


@router.get("/{system}")
async def integration_detail(system: str, user=Depends(current_user)):
    key = (system or "").lower()
    if key not in SYSTEMS:
        raise HTTPException(status_code=404, detail="Sistema no integrado. Disponibles: moodle, teams, banner.")
    return {"mock": True, **_build(key, user)}
