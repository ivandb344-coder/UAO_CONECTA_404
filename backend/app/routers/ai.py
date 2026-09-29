from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
import os
from openai import AsyncOpenAI

from app.core.security import current_user
from app.models.schemas import AIQuestion

router = APIRouter()


@router.post("/ai")
async def ai(data: AIQuestion, user=Depends(current_user)):
    message = (data.message or "").strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Escribe un mensaje para el asistente.",
        )

    # Acepta OPENAI_API_KEY o EMERGENT_LLM_KEY para mantener compatibilidad
    api_key = (os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY", "")).strip()

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="El asistente de IA no está configurado. Falta OPENAI_API_KEY o EMERGENT_LLM_KEY en el backend.",
        )

    try:
        client = AsyncOpenAI(api_key=api_key)

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres el asistente de UAO Conecta. "
                        "Responde siempre en español, de forma clara, "
                        "amable y breve. "
                        "Ayuda al usuario a orientarse dentro de la plataforma "
                        "y sobre temas académicos generales. "
                        "No inventes información institucional. "
                        "Si no tienes certeza sobre un dato institucional, "
                        "indícalo claramente y recomienda consultar fuentes oficiales."
                    )
                },
                {
                    "role": "user",
                    "content": message
                }
            ]
        )

        content = response.choices[0].message.content or "No recibí una respuesta del asistente."

        return PlainTextResponse(
            content=content,
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