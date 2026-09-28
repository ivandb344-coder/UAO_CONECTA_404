from datetime import datetime, timezone
import uuid
from app.core.config import db

async def _create_notification(user_id: str, kind: str, title: str, body: str, link: str = ""):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "body": body,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)
    return doc
