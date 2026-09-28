from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import os

from app.core.security import current_user
from app.models.schemas import AIQuestion
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

router = APIRouter()

@router.post("/ai")
async def ai(data: AIQuestion, user=Depends(current_user)):
    async def stream():
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"uao-{user['id']}",
            system_message="Eres el asistente de UAO Conecta. Responde en español, con claridad y brevedad. No inventes información institucional; si no sabes algo, dilo y recomienda fuentes oficiales.",
        ).with_model("openai", "gpt-5.4-mini")
        async for event in chat.stream_message(UserMessage(text=data.message)):
            if isinstance(event, TextDelta):
                yield event.content
            elif isinstance(event, StreamDone):
                break

    return StreamingResponse(stream(), media_type="text/plain", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
