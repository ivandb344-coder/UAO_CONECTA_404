"""Pure helpers for stable, private direct-message room identities."""
import hashlib


DIRECT_ROOM_PREFIX = "dm-"


def direct_room_id(user_a: str, user_b: str) -> str:
    participants = ":".join(sorted((user_a, user_b)))
    digest = hashlib.sha256(participants.encode("utf-8")).hexdigest()[:32]
    return f"{DIRECT_ROOM_PREFIX}{digest}"


def can_access_direct_room(conversation: dict | None, user_id: str) -> bool:
    return bool(conversation and user_id in (conversation.get("participants") or []))
