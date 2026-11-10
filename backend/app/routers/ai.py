import logging
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv

from app.core.security import current_user
from app.models.schemas import AIQuestion

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter()

# Gemini Flash-Lite ofrece una cuota gratuita limitada para proyectos elegibles.
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"

SYSTEM_PROMPT = (
    "Eres el asistente académico y de navegación de UAO Conecta, una aplicación de apoyo "
    "estudiantil de la Universidad Autónoma de Occidente en Cali. Responde en español, "
    "con tono amable, preciso y directo. Usa el historial reciente para conservar el tema "
    "y no repitas preguntas ya respondidas. Cuando pidan pasos, enumera la ruta exacta "
    "dentro de la aplicación. Distingue orientación general de información personal o "
    "actual. No tienes acceso a las notas, matrícula, horario personal, aulas de Moodle, "
    "mensajes de Teams, calendario privado ni datos en vivo de Banner, salvo que el usuario "
    "los copie en la conversación; nunca digas que consultaste esos sistemas. No inventes "
    "nombres de materias, fechas, cupos, calificaciones, políticas ni rutas que no conozcas. "
    "Si falta contexto para contestar de manera exacta, pregunta una sola cosa concreta; "
    "si la respuesta depende de información oficial o reciente, indica qué fuente oficial "
    "debe verificarse. Funciones del Hub que sí puedes explicar: Inicio, Dudas y sus "
    "respuestas, Asignaturas, Asesorías, Chat, perfil, Configuración y Reconocimientos. "
    "Mantén las respuestas breves, pero desarrolla los pasos necesarios para resolver la pregunta. "
    "Guía concreta de la aplicación: Inicio muestra accesos y actividad; Dudas permite buscar, "
    "publicar una pregunta y valorar respuestas; Asignaturas separa Mis espacios y Catálogo oficial UAO. "
    "Para entrar a un espacio se usa Unirme con código. Dentro de un espacio están tareas, recursos y su chat. "
    "Quien creó un espacio como profesor o monitor puede cerrarlo (conserva el historial y deja el chat solo "
    "para lectura) o eliminarlo; los demás pueden usar Salir de la asignatura, que avisa al chat. "
    "En Chat se elige Comunidad UAO o el canal de una asignatura; un estudiante puede usar Escribir a un profesor. "
    "Cada persona puede editar o eliminar sus mensajes durante el primer minuto. Asesorías tiene Explorar espacios "
    "y Mis asesorías, con vistas Calendario y Lista. En Reconocimientos se consulta el ranking de respuestas y "
    "valoraciones. En Perfil se edita la información personal. Para una cuenta creada con Google, la contraseña "
    "actual de Google no sirve como contraseña manual de UAO Conecta: se crea desde Configuración, en Acceso manual. "
    "La contraseña manual solo abre UAO Conecta; para Google, Moodle, CampusDigital o UAO Virtual se usan sus "
    "credenciales y procesos oficiales."
)

async def _llm_answer(message: str, history: list[dict]) -> str:
    """Genera respuestas mediante Gemini, manteniendo la clave solo en el servidor."""
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("Sin GEMINI_API_KEY configurada.")

    contents = []
    for item in history[-8:]:
        role = item.get("role")
        content = str(item.get("content") or "").strip()[:1200]
        if role in {"user", "assistant"} and content:
            contents.append({
                "role": "model" if role == "assistant" else "user",
                "parts": [{"text": content}],
            })
    contents.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": 700, "temperature": 0.25},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            GEMINI_API_URL,
            headers={"x-goog-api-key": api_key},
            json=payload,
        )
    response.raise_for_status()

    candidates = response.json().get("candidates") or []
    parts = (candidates[0].get("content") or {}).get("parts") or [] if candidates else []
    answer = "\n".join(
        str(part.get("text") or "").strip()
        for part in parts
        if str(part.get("text") or "").strip()
    )
    if not answer:
        raise RuntimeError("Gemini no devolvió texto en su respuesta.")
    return answer


@router.post("/ai")
async def ai(data: AIQuestion, user=Depends(current_user)):
    message = (data.message or "").strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Escribe un mensaje para el asistente.",
        )

    try:
        safe_history = [item for item in data.history if isinstance(item, dict)]
        answer = await _llm_answer(message, safe_history)
    except Exception as exc:
        # Nunca sustituir el modelo por respuestas prefabricadas: informar la desconexión.
        logger.warning("No fue posible obtener respuesta del modelo de IA (%s).", type(exc).__name__)
        if not (os.getenv("GEMINI_API_KEY") or "").strip():
            detail = (
                "El asistente con IA aún no está conectado. Configura GEMINI_API_KEY en las variables "
                "privadas del servicio de Render y vuelve a intentarlo. Puedes crear una clave gratuita en Google AI Studio."
            )
        elif isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429:
            detail = "Se alcanzó el límite gratuito de consultas por ahora. Espera un momento y vuelve a intentarlo."
        elif isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in {401, 403}:
            detail = "La clave de Gemini no es válida o no tiene acceso a este modelo. Revisa GEMINI_API_KEY en Render."
        else:
            detail = (
                "No pude conectar con Gemini en este momento. Inténtalo de nuevo en unos minutos."
            )
        raise HTTPException(status_code=503, detail=detail) from exc

    return PlainTextResponse(
        content=answer,
        media_type="text/plain; charset=utf-8",
        headers={"X-Assistant-Mode": "model"},
    )
