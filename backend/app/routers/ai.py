import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv
from openai import AsyncOpenAI

from app.core.security import current_user
from app.models.schemas import AIQuestion

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter()

# Modelo por defecto utilizando cliente estándar de OpenAI
MODEL_NAME = os.getenv("LLM_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = (
    "Eres el asistente de UAO Conecta, el Hub de Integración Estudiantil de la "
    "Universidad Autónoma de Occidente (Cali, Colombia). Respondes SIEMPRE en español, "
    "de forma clara, amable y breve (máximo ~6 líneas). Ayudas al estudiante a orientarse "
    "entre asignaturas, tareas, asesorías, recursos y personas, y sobre temas académicos "
    "generales. El Hub unifica Moodle (aulas y notas), Teams (mensajes y reuniones) y "
    "Banner (matrícula y promedio) en una sola sesión @uao.edu.co. No inventes datos "
    "institucionales puntuales: si no tienes certeza, dilo y recomienda las fuentes "
    "oficiales (Moodle, Teams, Banner o la coordinación del programa)."
)

# ---------------------------------------------------------------------------
# MODO SIMULADO (Mock AI): garantiza que el chat SIEMPRE responda con sentido
# académico sobre la UAO aunque falle la conexión externa o falte la clave.
# ---------------------------------------------------------------------------
_MOCK_RULES = [
    (("asesoria", "asesoría", "tutoria", "tutoría", "monitor", "monitoria", "monitoría"),
     "En la sección Asesorías encuentras a docentes y monitores con su horario, modalidad "
     "(presencial o virtual) y cupos reservables. Para Cálculo y Programación suele haber "
     "monitorías esta semana; abre 'Asesorías' en el menú y reserva el cupo que te sirva."),
    (("horario", "clase", "clases", "cuando", "cuándo", "hora"),
     "Tus horarios de clase se sincronizan desde Banner y aparecen en el tablero de Inicio. "
     "Las reuniones y clases virtuales las verás en la tarjeta de Teams. Revisa 'Inicio' para "
     "el resumen del día sin saltar entre plataformas."),
    (("nota", "notas", "calificacion", "calificación", "promedio", "parcial"),
     "Tus calificaciones se publican en Moodle y tu promedio acumulado se refleja en la tarjeta "
     "de Banner del Inicio (escala 0.0 – 5.0). Si una nota no aparece, consúltala directamente en "
     "Moodle o con el docente de la asignatura."),
    (("matricula", "matrícula", "banner", "creditos", "créditos", "inscripcion", "inscripción"),
     "El estado de tu matrícula, los créditos y el periodo académico vienen de Banner y los ves en "
     "el Inicio. Para trámites de matrícula usa el botón 'Abrir Banner' en esa tarjeta."),
    (("moodle", "entrega", "entregas", "tarea", "taller", "quiz", "recurso"),
     "Las entregas, talleres y recursos de tus aulas están en Moodle y se resumen en la tarjeta de "
     "Moodle del Inicio ('Entregas próximas', 'Recursos nuevos'). También puedes publicar y revisar "
     "material dentro de cada Asignatura del Hub."),
    (("teams", "reunion", "reunión", "mensaje", "chat", "grupo"),
     "Los mensajes y reuniones de tus equipos de clase están en Microsoft Teams, resumidos en la "
     "tarjeta de Teams del Inicio. Para coordinar con tu grupo también tienes el chat por asignatura "
     "dentro del Hub."),
    (("duda", "pregunta", "preguntar", "acudir", "ayuda", "no se", "no sé"),
     "Si no sabes a quién acudir, usa 'Dudas': puedes preguntar por asignatura de forma asíncrona e "
     "incluso anónima, y ver quién responde. Para apoyo en vivo, revisa 'Asesorías' con docentes y "
     "monitores disponibles."),
    (("contrasena", "contraseña", "acceso", "login", "ingresar", "clave"),
     "El acceso es con tu cuenta institucional @uao.edu.co (una sola sesión para Moodle, Teams y "
     "Banner). Si olvidaste tu contraseña, usa '¿Olvidaste tu contraseña?' en la pantalla de inicio "
     "de sesión para recibir el enlace de recuperación."),
    (("hola", "buenas", "buenos dias", "buenos días", "buenas tardes", "que tal", "qué tal"),
     "¡Hola! Soy el asistente de UAO Conecta. Puedo orientarte sobre asesorías, horarios, notas, "
     "matrícula y dónde resolver tus dudas. ¿Qué necesitas encontrar hoy?"),
]

_MOCK_DEFAULT = (
    "Soy el asistente de UAO Conecta y te ayudo a orientarte en el Hub. Puedo guiarte hacia tus "
    "asesorías y monitorías, tus horarios y notas (Moodle/Banner), la coordinación por Teams o la "
    "sección de Dudas para preguntar por asignatura. Cuéntame un poco más sobre lo que buscas y te "
    "indico la mejor ruta dentro de la plataforma."
)


def _mock_answer(message: str) -> str:
    text = (message or "").lower()
    for keywords, answer in _MOCK_RULES:
        if any(k in text for k in keywords):
            return answer
    return _MOCK_DEFAULT


async def _llm_answer(message: str, session_id: str) -> str:
    """Respuesta con el LLM utilizando la librería estándar de OpenAI."""
    api_key = (os.getenv("EMERGENT_LLM_KEY") or os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("Sin EMERGENT_LLM_KEY/OPENAI_API_KEY configurada.")

    client = AsyncOpenAI(api_key=api_key)

    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        max_tokens=300,
        temperature=0.7,
    )

    content = response.choices[0].message.content if response.choices else None
    if not content or not content.strip():
        raise RuntimeError("El modelo devolvió una respuesta vacía.")
    return content.strip()


@router.post("/ai")
async def ai(data: AIQuestion, user=Depends(current_user)):
    message = (data.message or "").strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Escribe un mensaje para el asistente.",
        )

    session_id = f"uao-ai-{user.get('id') or user.get('email') or 'anon'}"

    try:
        answer = await _llm_answer(message, session_id)
    except Exception as exc:
        # El chat SIEMPRE responde: ante cualquier fallo caemos al modo simulado.
        logger.warning("Asistente IA en modo simulado (fallback): %s", exc)
        answer = _mock_answer(message)

    return PlainTextResponse(
        content=answer,
        media_type="text/plain; charset=utf-8",
    )
