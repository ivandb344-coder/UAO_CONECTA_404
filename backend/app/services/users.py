from urllib.parse import urlparse
from app.core.config import ROLES, PROGRAM_NAMES, DEFAULT_ACCESSIBILITY

def public_user(u):
    keys = ["id", "name", "username", "email", "role", "program", "semester", "bio", "picture",
            "phone", "contact_info", "academic_info", "links", "rating", "rating_count", "profile_completed", "auth_provider"]
    out = {k: u.get(k) for k in keys}
    if out["profile_completed"] is None:
        out["profile_completed"] = _profile_completed(u)
    out["links"] = out.get("links") or []
    stored = (u.get("preferences") or {}).get("accessibility") or {}
    out["preferences"] = {"accessibility": {**DEFAULT_ACCESSIBILITY, **stored}}
    return out

def clean(doc):
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc

def _url_ok(u: str) -> bool:
    if not u or not isinstance(u, str):
        return False
    value = u.strip()
    if value.startswith(("mailto:", "tel:")):
        return len(value.split(":", 1)[1].strip()) > 0
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)

def _profile_completed(u: dict) -> bool:
    if not (u.get("username") and u.get("role") in ROLES and u.get("program") in PROGRAM_NAMES):
        return False
    if u.get("role") == "student":
        try:
            return 1 <= int(u.get("semester")) <= 12
        except (TypeError, ValueError):
            return False
    if u.get("semester") in (None, ""):
        return True
    try:
        return 1 <= int(u.get("semester")) <= 12
    except (TypeError, ValueError):
        return False
