"""Iteration 5 tests — Google auth, self-booking prevention, chat unread + presence + attachments."""
import io
import json
import os
import time
import asyncio
import pytest
import requests
import websockets

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
WS_BASE = BASE.replace("https://", "wss://").replace("http://", "ws://")


def _demo_student():
    r = requests.post(f"{BASE}/api/auth/demo")
    assert r.status_code == 200
    return r.json()


def _demo_advisor():
    r = requests.post(f"{BASE}/api/auth/demo-advisor")
    assert r.status_code == 200
    return r.json()


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Google auth ----------
def test_google_auth_endpoint_exists_and_rejects_invalid_session():
    r = requests.post(f"{BASE}/api/auth/google", json={"session_id": "TEST_invalid_session_xyz"})
    assert r.status_code == 401, f"expected 401 on invalid session, got {r.status_code}: {r.text}"


def test_google_auth_requires_session_id_field():
    r = requests.post(f"{BASE}/api/auth/google", json={})
    assert r.status_code == 422


# ---------- Public user should include picture ----------
def test_public_user_has_picture_field_on_me():
    tok = _demo_student()["token"]
    r = requests.get(f"{BASE}/api/auth/me", headers=_hdr(tok))
    assert r.status_code == 200
    body = r.json()
    assert "picture" in body, f"public_user should include 'picture' key, got: {list(body.keys())}"


def test_demo_and_demo_advisor_work():
    st = _demo_student()
    assert "token" in st and "user" in st
    assert st["user"]["email"] == "estudiante@uao.edu.co"
    ad = _demo_advisor()
    assert ad["user"]["role"] == "monitor"


# ---------- Self-booking prevention ----------
def test_advisor_cannot_book_own_advisory_returns_409():
    ad = _demo_advisor()
    ad_tok = ad["token"]
    # Create an advisory owned by the monitor
    payload = {
        "subject": "TEST_selfbook",
        "topic": "TEST_selfbook_topic",
        "date": "Sábado TEST",
        "time": "9:00 a. m.",
        "mode": "Virtual",
        "slots": 3,
        "place": "",
        "link": "",
        "active": True,
    }
    created = requests.post(f"{BASE}/api/advisories", json=payload, headers=_hdr(ad_tok))
    assert created.status_code == 200, created.text
    aid = created.json()["id"]

    # Try to self-book
    r = requests.post(
        f"{BASE}/api/bookings", json={"advisory_id": aid, "note": "TEST self"}, headers=_hdr(ad_tok)
    )
    assert r.status_code == 409, f"self-book must be 409, got {r.status_code}"
    detail = r.json().get("detail", "")
    assert "propia" in detail.lower(), f"expected message mentioning 'propia', got: {detail}"

    # Cleanup
    requests.delete(f"{BASE}/api/advisories/{aid}", headers=_hdr(ad_tok))


# ---------- Chat summary + seen ----------
def test_chat_summary_and_seen_flow():
    st = _demo_student()
    ad = _demo_advisor()
    st_tok = st["token"]
    ad_tok = ad["token"]
    room = f"TEST_unread_{int(time.time())}"

    # Student marks room as seen first (baseline)
    r = requests.post(f"{BASE}/api/chat/{room}/seen", headers=_hdr(st_tok))
    assert r.status_code == 200
    assert r.json()["ok"] is True

    # Advisor posts messages via HTTP
    for i in range(3):
        p = requests.post(f"{BASE}/api/chat", json={"body": f"TEST_msg_{i}", "room": room}, headers=_hdr(ad_tok))
        assert p.status_code == 200

    # Student summary should now show unread count for this room
    s = requests.get(f"{BASE}/api/chat/summary", headers=_hdr(st_tok))
    assert s.status_code == 200
    data = s.json()
    assert "total" in data and "rooms" in data
    assert data["rooms"].get(room, 0) >= 3, f"expected >=3 unread in {room}, got: {data}"

    # Student marks seen -> counter drops for that room
    requests.post(f"{BASE}/api/chat/{room}/seen", headers=_hdr(st_tok))
    s2 = requests.get(f"{BASE}/api/chat/summary", headers=_hdr(st_tok))
    assert s2.status_code == 200
    assert room not in s2.json()["rooms"], f"room should be cleared, got: {s2.json()}"


def test_chat_summary_requires_auth():
    r = requests.get(f"{BASE}/api/chat/summary")
    assert r.status_code == 401


# ---------- File upload ----------
def test_file_upload_returns_storage_path():
    tok = _demo_student()["token"]
    files = {"file": ("test.txt", io.BytesIO(b"hello TEST"), "text/plain")}
    r = requests.post(f"{BASE}/api/files", files=files, headers=_hdr(tok))
    # Storage backend may be unavailable in test env; accept 200 or gracefully skip on 502/500
    if r.status_code in (500, 502):
        pytest.skip(f"storage backend unavailable: {r.status_code}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert "storage_path" in body and body["name"] == "test.txt"
    assert body.get("content_type") == "text/plain"


# ---------- WebSocket presence + attachments ----------
@pytest.mark.asyncio
async def test_ws_presence_payload_shape():
    ad = _demo_advisor()
    tok = ad["token"]
    room = f"TEST_pres_{int(time.time())}"
    url = f"{WS_BASE}/api/ws/chat/{room}?token={tok}"
    async with websockets.connect(url) as ws:
        raw = await asyncio.wait_for(ws.recv(), timeout=5)
        payload = json.loads(raw)
        assert payload["type"] == "presence"
        assert isinstance(payload.get("users"), list)
        assert len(payload["users"]) >= 1
        u = payload["users"][0]
        for key in ("id", "name", "role", "initial"):
            assert key in u, f"missing {key} in presence user: {u}"
        assert "picture" in u  # can be None but key should exist
        assert u["role"] in ("student", "monitor", "professor")


@pytest.mark.asyncio
async def test_ws_invalid_token_closes_4401():
    room = f"TEST_401_{int(time.time())}"
    url = f"{WS_BASE}/api/ws/chat/{room}?token=INVALID"
    try:
        async with websockets.connect(url) as ws:
            await asyncio.wait_for(ws.recv(), timeout=3)
        assert False, "should have closed"
    except Exception as e:
        # Accept either app-level 4401 close or ingress-level 403/401 rejection
        code = getattr(e, "code", None) or getattr(getattr(e, "response", None), "status_code", None)
        msg = str(e)
        assert code in (4401, 401, 403) or "401" in msg or "403" in msg or "4401" in msg, (
            f"unexpected exception: {type(e).__name__}: {e}"
        )


@pytest.mark.asyncio
async def test_ws_message_with_file_attachment_broadcasts():
    st = _demo_student()
    ad = _demo_advisor()
    room = f"TEST_file_{int(time.time())}"
    url_a = f"{WS_BASE}/api/ws/chat/{room}?token={st['token']}"
    url_b = f"{WS_BASE}/api/ws/chat/{room}?token={ad['token']}"
    async with websockets.connect(url_a) as wa, websockets.connect(url_b) as wb:
        # drain presence events
        for w in (wa, wb):
            try:
                while True:
                    await asyncio.wait_for(w.recv(), timeout=0.7)
            except asyncio.TimeoutError:
                pass
        payload = {
            "body": "TEST_with_file",
            "file": {
                "name": "demo.pdf",
                "storage_path": "uao-conecta/uploads/demo-student/fake-path.pdf",
                "content_type": "application/pdf",
                "size": 12345,
            },
        }
        await wa.send(json.dumps(payload))
        # wb should receive a message event with file field
        got = None
        for _ in range(4):
            raw = await asyncio.wait_for(wb.recv(), timeout=3)
            data = json.loads(raw)
            if data.get("type") == "message":
                got = data
                break
        assert got is not None, "did not receive broadcast message"
        m = got["message"]
        assert m["body"] == "TEST_with_file"
        assert m.get("file", {}).get("name") == "demo.pdf"
        assert m["file"]["content_type"] == "application/pdf"


# ---------- Dudas regression: rating restrictions ----------
def test_dudas_rating_and_accept_restrictions():
    st = _demo_student()
    ad = _demo_advisor()
    q = requests.post(
        f"{BASE}/api/questions",
        json={"title": "TEST_rating_q", "description": "d", "subject": "Cálculo I", "tags": [], "anonymous": False},
        headers=_hdr(st["token"]),
    )
    assert q.status_code == 200
    qid = q.json()["id"]
    # Advisor answers
    a = requests.post(f"{BASE}/api/questions/{qid}/answers", json={"body": "TEST answer"}, headers=_hdr(ad["token"]))
    assert a.status_code == 200
    aid = a.json()["id"]
    # Owner-advisor cannot rate own answer
    r = requests.post(f"{BASE}/api/answers/{aid}/rating", json={"rating": 5}, headers=_hdr(ad["token"]))
    assert r.status_code == 403
    # Student (question owner) can rate
    r2 = requests.post(f"{BASE}/api/answers/{aid}/rating", json={"rating": 4}, headers=_hdr(st["token"]))
    assert r2.status_code == 200
    # Non-owner cannot accept
    r3 = requests.post(f"{BASE}/api/questions/{qid}/accept/{aid}", headers=_hdr(ad["token"]))
    assert r3.status_code == 403
    # Owner can accept
    r4 = requests.post(f"{BASE}/api/questions/{qid}/accept/{aid}", headers=_hdr(st["token"]))
    assert r4.status_code == 200
    # Detail contains rating fields
    det = requests.get(f"{BASE}/api/questions/{qid}", headers=_hdr(st["token"]))
    assert det.status_code == 200
    dbody = det.json()
    assert dbody["accepted_id"] == aid
    ans0 = dbody["answers"][0]
    for k in ("rating", "rating_count", "my_rating", "is_accepted", "can_rate"):
        assert k in ans0
    assert dbody["is_owner"] is True


def test_advisories_regression_status_transitions():
    st = _demo_student()
    ad = _demo_advisor()
    # Student cannot create advisory
    r = requests.post(
        f"{BASE}/api/advisories",
        json={"subject": "X", "topic": "y", "date": "d", "time": "t", "mode": "Virtual", "slots": 2, "place": "", "link": "", "active": True},
        headers=_hdr(st["token"]),
    )
    assert r.status_code == 403
    # Incoming for student = []
    inc = requests.get(f"{BASE}/api/bookings/incoming", headers=_hdr(st["token"]))
    assert inc.status_code == 200 and inc.json() == []
    # Invalid status = 422
    fake = requests.patch(
        f"{BASE}/api/bookings/nope/status",
        json={"status": "INVALID"},
        headers=_hdr(ad["token"]),
    )
    assert fake.status_code == 422
