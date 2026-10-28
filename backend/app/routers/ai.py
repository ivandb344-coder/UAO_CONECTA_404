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

# ---------------------------------------------------------------------------
# MODO SIMULADO (Mock AI): garantiza que el chat SIEMPRE responda con sentido
# académico sobre la UAO aunque falle la conexión externa o falte la clave.
# ---------------------------------------------------------------------------
_MOCK_RULES = [
    (("editar mensaje", "modificar mensaje", "eliminar mensaje", "borrar mensaje"),
     "En Chat, abre la sala y busca tu mensaje. Usa Editar o Eliminar durante el primer minuto después de enviarlo; "
     "pasado ese plazo, el contenido queda fijo. Solo puedes cambiar tus propios mensajes."),
    (("salir de la asignatura", "salirme de la asignatura", "abandonar la asignatura", "salir de una materia"),
     "Abre Asignaturas → Mis espacios → Ver asignatura y elige Salir de la asignatura. Dejarás de ver el espacio "
     "y su chat, y se publicará un aviso en la conversación para el grupo. Si tú creaste el espacio como responsable, "
     "debes cerrarlo o eliminarlo en vez de salir."),
    (("cerrar asignatura", "cerrar materia", "eliminar asignatura", "eliminar materia"),
     "Solo la persona que creó el espacio como profesor o monitor puede gestionarlo. Entra en Asignaturas → Mis espacios "
     "→ Ver asignatura. Cerrar conserva tareas, recursos e historial y deja el chat en solo lectura; eliminar lo retira "
     "del listado y cierra el chat para sus integrantes."),
    (("ranking", "reconocimientos", "podio", "mejores monitores"),
     "Abre Reconocimientos desde el menú. Puedes cambiar entre Más respuestas y Mejor valorados; el ranking se basa "
     "en respuestas y valoraciones registradas, y puedes abrir el perfil de cada monitor."),
    (("contraseña actual", "cambiar contraseña", "inicie con google", "inicié con google", "inicie sesión con google", "inicié sesión con google"),
     "Si entraste con Google, no tienes una contraseña manual actual para UAO Conecta. Ve a Configuración → Acceso manual "
     "y crea una contraseña para este Hub; no necesitas escribir la contraseña de Google. Esta clave solo sirve para "
     "UAO Conecta y no modifica Google, Moodle ni UAO Virtual."),
    (("recuperar contraseña", "recuperar contrasena", "olvidé mi contraseña", "olvide mi contraseña", "restablecer contraseña", "restablecer contrasena"),
     "Para recuperar la clave propia de UAO Conecta, vuelve al inicio de sesión y abre ¿Olvidaste tu contraseña?; "
     "el enlace se envía al correo asociado si el servicio de correo está habilitado. Si aparece un aviso de que el "
     "servidor no puede enviar correos, esa recuperación no está disponible hasta configurar el correo del servidor. "
     "Para cambiar la clave institucional de Google, CampusDigital o UAO Virtual, usa el portal oficial de UAO Virtual; "
     "esa clave es distinta de la de UAO Conecta."),
    (("contraseña", "contrasena", "login", "iniciar sesión", "iniciar sesion", "ingresar"),
     "En el inicio, usa Continuar con Google institucional para entrar con tu cuenta @uao.edu.co. El formulario manual "
     "usa una contraseña propia de UAO Conecta, no la clave de Google, CampusDigital, Moodle ni UAO Virtual. Si ya "
     "entraste con Google, crea la clave del Hub en Configuración → Acceso manual."),
    (("asesoria", "asesoría", "tutoria", "tutoría", "monitor", "monitoria", "monitoría"),
     "Abre Asesorías y entra en Explorar espacios para ver fechas, modalidad y cupos publicados. "
     "No puedo consultar desde aquí la disponibilidad actual; confirma el espacio antes de reservar."),
    (("horario", "clase", "clases", "cuando", "cuándo", "hora"),
     "No tengo acceso a tu horario personal ni a una sincronización en vivo con Banner. Consulta "
     "Banner o el canal oficial de tu programa; si compartes aquí un horario, puedo ayudarte a interpretarlo."),
    (("nota", "notas", "calificacion", "calificación", "promedio", "parcial"),
     "No puedo ver tus calificaciones ni tu promedio. Consulta la plataforma oficial que indique "
     "tu curso o pregunta a tu docente; si pegas los datos aquí, te ayudo a revisarlos."),
    (("matricula", "matrícula", "banner", "creditos", "créditos", "inscripcion", "inscripción"),
     "No puedo consultar tu matrícula ni confirmar una sincronización con Banner. Revisa Banner y "
     "los avisos oficiales de Registro Académico para conocer tu estado o fechas de trámite."),
    (("moodle", "entrega", "entregas", "tarea", "taller", "quiz", "recurso"),
     "En Asignaturas puedes consultar tareas y recursos publicados en el Hub. No tengo acceso al "
     "contenido de tus aulas Moodle; abre Moodle desde los enlaces institucionales para revisar "
     "entregas o actividades oficiales."),
    (("teams", "reunion", "reunión", "mensaje", "chat", "grupo"),
     "Para coordinarte en UAO Conecta, abre Chat y elige la sala de tu asignatura. No puedo leer "
     "Teams ni ver sus reuniones; consulta Teams para tus conversaciones institucionales."),
    (("duda", "pregunta", "preguntar", "acudir", "ayuda", "no se", "no sé"),
     "Puedes publicar una pregunta en Dudas y elegir la asignatura; las respuestas y valoraciones "
     "quedan en la misma conversación. Para conversar en tiempo real, revisa Asesorías o el Chat."),
    (("hola", "buenas", "buenos dias", "buenos días", "buenas tardes", "que tal", "qué tal"),
     "¡Hola! Soy el asistente de UAO Conecta. Puedo orientarte sobre asesorías, horarios, notas, "
     "matrícula y dónde resolver tus dudas. ¿Qué necesitas encontrar hoy?"),
]

_MOCK_DEFAULT = (
    "Puedo orientarte sobre cómo usar Inicio, Dudas, Asignaturas, Asesorías, Chat, tu perfil o "
    "Configuración. No tengo acceso a datos personales ni a los sistemas institucionales en vivo. "
    "Dime qué tarea concreta intentas completar y en qué pantalla estás para darte los pasos exactos."
)


def _mock_answer(message: str) -> str:
    text = (message or "").lower()
    for keywords, answer in _MOCK_RULES:
        if any(k in text for k in keywords):
            return answer
    return _MOCK_DEFAULT


async def _llm_answer(message: str, session_id: str, history: list[dict]) -> str:
    """Respuesta con el LLM utilizando la librería estándar de OpenAI."""
    api_key = (os.getenv("EMERGENT_LLM_KEY") or os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("Sin EMERGENT_LLM_KEY/OPENAI_API_KEY configurada.")

    client = AsyncOpenAI(api_key=api_key)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in history[-8:]:
        role = item.get("role")
        content = str(item.get("content") or "").strip()[:1200]
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        max_tokens=500,
        temperature=0.25,
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
        safe_history = [item for item in data.history if isinstance(item, dict)]
        answer = await _llm_answer(message, session_id, safe_history)
        mode = "model"
    except Exception as exc:
        # El modo limitado ofrece rutas seguras y no inventa datos personales o disponibilidad.
        logger.warning("Asistente IA en modo simulado (fallback): %s", exc)
        answer = _mock_answer(message)
        mode = "limited"

    return PlainTextResponse(
        content=answer,
        media_type="text/plain; charset=utf-8",
        headers={"X-Assistant-Mode": mode},
    )
