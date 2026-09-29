from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
import os

from app.core.security import current_user
from app.models.schemas import AIQuestion
from emergentintegrations.llm.chat import LlmChat, UserMessage

router = APIRouter()


@router.post("/ai")
async def ai(data: AIQuestion, user=Depends(current_user)):
    message = (data.message or "").strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Escribe un mensaje para el asistente.",
        )

    api_key = os.getenv("EMERGENT_LLM_KEY", "").strip()

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="El asistente de IA no está configurado. Falta EMERGENT_LLM_KEY en el backend.",
        )

    try:
        chat = (
            LlmChat(
                api_key=api_key,
                session_id=f"uao-{user['id']}",
                system_message=(
                    "Eres el asistente de UAO Conecta. "
                    "Responde siempre en español, de forma clara, "
                    "amable y breve. "
                    "Ayuda al usuario a orientarse dentro de la plataforma "
                    "y sobre temas académicos generales. "
                    "No inventes información institucional. "
                    "Si no tienes certeza sobre un dato institucional, "
                    "indícalo claramente y recomienda consultar fuentes oficiales."
                ),
            )
            .with_model("openai", "gpt-4o-mini")
        )

        response = await chat.send_message(
            UserMessage(text=message)
        )

        return PlainTextResponse(
            content=response or "No recibí una respuesta del asistente.",
            media_type="text/plain; charset=utf-8",
        )

    except Exception as exc:
        print(f"ERROR EN ASISTENTE IA: {exc}")

        raise HTTPException(
            status_code=500,
            detail=(
                "No pude procesar tu mensaje en este momento. "
                "Revisa la configuración del asistente de IA."
            ),
        )