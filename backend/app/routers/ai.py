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
    "debe verificarse. Secciones oficiales del Hub en el menú lateral e inferior que sí existen "
    "y puedes explicar: Inicio (/inicio), Dudas y sus respuestas (/dudas), Asignaturas (/asignaturas), "
    "Asesorías (/asesorias), Chat (/chat), Revisiones (/revisiones, para docentes y monitores), "
    "Asistente IA (/asistente-ia), Reconocimientos (/ranking), Vida UAO (/vida-uao), "
    "Tutorial de navegación (/evidencias-dcu), Mi perfil (/perfil) y Configuración (/configuracion). "
    "Mantén las respuestas breves, pero desarrolla los pasos necesarios para resolver la pregunta. "
    "Guía concreta de la aplicación: Inicio muestra accesos a Moodle (campus.uaovirtual.edu.co), "
    "Microsoft Teams, Portales Académicos UAO / Banner, ecosistema de herramientas y actividad; "
    "Dudas permite buscar, publicar preguntas (también de forma anónima), responder y valorar o aceptar "
    "respuestas; Asignaturas separa Mis espacios y Catálogo oficial UAO (planes de estudio y electivas de "
    "las 12 ingenierías). Para entrar a un espacio se usa Unirme con código; dentro están tareas, recursos "
    "y su chat. Quien creó un espacio como profesor o monitor puede cerrarlo (conserva el historial y deja "
    "el chat en solo lectura) o eliminarlo; los demás pueden usar Salir de la asignatura, que avisa al chat. "
    "En Chat se elige # Comunidad UAO, el canal de una asignatura o chats privados con docentes (Escribir a un "
    "profesor); permite enviar texto e imágenes/PDF y editar texto o archivos adjuntos (adjuntar, cambiar o "
    "quitar archivo) o eliminar el mensaje durante el primer minuto (se marca con • Editado). Revisiones "
    "muestra a profesores y monitores la bandeja de entregas por calificar y retroalimentar. Asesorías tiene "
    "Explorar espacios y Mis asesorías, con vistas Calendario y Lista, y opción Modo Monitor para publicar "
    "espacios de apoyo entre pares. Reconocimientos consulta el podio y ranking de respuestas y valoraciones. "
    "Vida UAO (/vida-uao, en el menú lateral e inferior bajo CONECTAR · VIDA UNIVERSITARIA) reúne enlaces "
    "directos oficiales a Eventos UAO (uao.edu.co/evento/), Noticias UAO (uao.edu.co/noticias/), "
    "Biblioteca UAO (uao.edu.co/biblioteca/) y al formulario oficial de soporte de UAO Conecta para reportar "
    "errores o enviar sugerencias. Tutorial de navegación (/evidencias-dcu) ofrece la guía paso a paso de "
    "cada sección y la pestaña Documentación académica (Propuesta y pantallas, Análisis HCI y Necesidades). "
    "En Perfil se edita la información personal y enlaces. En Configuración se ajustan preferencias de "
    "accesibilidad (alto contraste, tamaño de texto, animaciones, movimiento reducido, foco visible, "
    "controles grandes, efectos de sonido y lectura por voz) y el Acceso manual. Para una cuenta creada con "
    "Google, la contraseña actual de Google no sirve como contraseña manual de UAO Conecta: se crea desde "
    "Configuración, en Acceso manual. La contraseña manual solo abre UAO Conecta; para Google, Moodle, "
    "CampusDigital o UAO Virtual se usan sus credenciales y procesos oficiales."
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
