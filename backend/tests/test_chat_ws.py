"""Chat WebSocket + HTTP tests + quick regression sanity."""
import os
import json
import asyncio
import pytest
import requests
import websockets

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://campus-connect-1569.preview.emergentagent.com"
WS_BASE = BASE.replace("https://", "wss://").replace("http://", "ws://")


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def student_token():
    r = requests.post(f"{BASE}/api/auth/demo", timeout=30)
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="session")
def advisor_token():
    r = requests.post(f"{BASE}/api/auth/demo-advisor", timeout=30)
    assert r.status_code == 200
    return r.json()["token"]


def _headers(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


# ---------- WebSocket auth ----------
@pytest.mark.asyncio
async def test_ws_invalid_token_rejected():
    url = f"{WS_BASE}/api/ws/chat/general?token=invalid.token.here"
    with pytest.raises(Exception) as exc:
        async with websockets.connect(url) as ws:
            await ws.recv()
    # websockets raises InvalidStatus / ConnectionClosed with code 4401
    assert "4401" in str(exc.value) or "rejected" in str(exc.value).lower() or "closed" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_ws_missing_token_rejected():
    url = f"{WS_BASE}/api/ws/chat/general"
    with pytest.raises(Exception):
        async with websockets.connect(url) as ws:
            await ws.recv()


# ---------- WebSocket presence + broadcast ----------
@pytest.mark.asyncio
async def test_ws_presence_and_broadcast(student_token, advisor_token):
    room = "TEST_ROOM_A"
    url_s = f"{WS_BASE}/api/ws/chat/{room}?token={student_token}"
    url_a = f"{WS_BASE}/api/ws/chat/{room}?token={advisor_token}"

    async with websockets.connect(url_s) as ws1:
        # First frame: presence with size=1
        first = json.loads(await asyncio.wait_for(ws1.recv(), timeout=5))
        assert first["type"] == "presence"
        assert first["size"] == 1

        async with websockets.connect(url_a) as ws2:
            # ws2 gets initial presence (size may already be 2)
            frame_ws2_first = json.loads(await asyncio.wait_for(ws2.recv(), timeout=5))
            assert frame_ws2_first["type"] == "presence"
            # ws1 should receive a broadcast presence with size=2
            got_size_2 = False
            for _ in range(3):
                frame = json.loads(await asyncio.wait_for(ws1.recv(), timeout=5))
                if frame["type"] == "presence" and frame["size"] >= 2:
                    got_size_2 = True
                    break
            assert got_size_2, "ws1 did not receive presence size>=2"

            # ws1 sends a message; both should receive it
            payload = {"body": "TEST_hello_ws"}
            await ws1.send(json.dumps(payload))

            async def wait_message(ws):
                for _ in range(5):
                    f = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
                    if f["type"] == "message" and f["message"]["body"] == "TEST_hello_ws":
                        return f["message"]
                return None

            m1 = await wait_message(ws1)
            m2 = await wait_message(ws2)
            assert m1 is not None and m2 is not None
            assert m1["id"] == m2["id"]
            assert m1["room"] == room

        # After ws2 disconnects, ws1 should get presence size=1
        got_size_1 = False
        for _ in range(3):
            try:
                frame = json.loads(await asyncio.wait_for(ws1.recv(), timeout=5))
                if frame["type"] == "presence" and frame["size"] == 1:
                    got_size_1 = True
                    break
            except asyncio.TimeoutError:
                break
        assert got_size_1, "ws1 did not receive presence size=1 after disconnect"

    # Persistence check via HTTP history
    r = requests.get(f"{BASE}/api/chat/{room}", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200
    bodies = [m["body"] for m in r.json()]
    assert "TEST_hello_ws" in bodies


@pytest.mark.asyncio
async def test_ws_room_isolation(student_token, advisor_token):
    room_a = "TEST_ROOM_ISO_A"
    room_b = "TEST_ROOM_ISO_B"
    async with websockets.connect(f"{WS_BASE}/api/ws/chat/{room_a}?token={student_token}") as wa, \
               websockets.connect(f"{WS_BASE}/api/ws/chat/{room_b}?token={advisor_token}") as wb:
        # Drain initial presence
        await asyncio.wait_for(wa.recv(), timeout=5)
        await asyncio.wait_for(wb.recv(), timeout=5)

        await wa.send(json.dumps({"body": "TEST_msg_only_A"}))
        # wa gets echo
        seen = False
        for _ in range(5):
            f = json.loads(await asyncio.wait_for(wa.recv(), timeout=5))
            if f["type"] == "message" and f["message"]["body"] == "TEST_msg_only_A":
                seen = True
                break
        assert seen

        # wb should NOT get this message
        try:
            f = json.loads(await asyncio.wait_for(wb.recv(), timeout=2))
            assert not (f["type"] == "message" and f["message"]["body"] == "TEST_msg_only_A")
        except asyncio.TimeoutError:
            pass  # expected


# ---------- HTTP fallback ----------
@pytest.mark.asyncio
async def test_http_post_broadcasts_to_ws(student_token, advisor_token):
    room = "TEST_ROOM_HTTP"
    async with websockets.connect(f"{WS_BASE}/api/ws/chat/{room}?token={student_token}") as ws:
        await asyncio.wait_for(ws.recv(), timeout=5)  # presence

        # Advisor POSTs via HTTP fallback
        r = requests.post(
            f"{BASE}/api/chat",
            headers=_headers(advisor_token),
            json={"body": "TEST_http_fallback", "room": room},
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["body"] == "TEST_http_fallback"

        got = False
        for _ in range(5):
            f = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if f["type"] == "message" and f["message"]["body"] == "TEST_http_fallback":
                got = True
                break
        assert got, "WS client did not receive HTTP-posted message"


def test_chat_history_endpoint(student_token):
    r = requests.get(f"{BASE}/api/chat/general", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # Ordered ascending
    if len(data) >= 2:
        assert data[0]["created_at"] <= data[-1]["created_at"]


# ---------- Regression: previous endpoints still work ----------
def test_regression_auth_me(student_token):
    r = requests.get(f"{BASE}/api/auth/me", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200
    assert r.json()["email"] == "estudiante@uao.edu.co"


def test_regression_dashboard(student_token):
    r = requests.get(f"{BASE}/api/dashboard", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200
    d = r.json()
    for k in ("user", "subjects", "questions", "bookings", "stats"):
        assert k in d


def test_regression_questions_flow(student_token):
    r = requests.get(f"{BASE}/api/questions", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200
    payload = {"title": "TEST_ws_regression", "description": "reg", "subject": "Cálculo I", "tags": ["test"]}
    r = requests.post(f"{BASE}/api/questions", headers=_headers(student_token), json=payload, timeout=10)
    assert r.status_code == 200
    qid = r.json()["id"]
    r = requests.get(f"{BASE}/api/questions/{qid}", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200
    assert r.json()["title"] == "TEST_ws_regression"


def test_regression_advisories_and_bookings(student_token, advisor_token):
    # List advisories as student
    r = requests.get(f"{BASE}/api/advisories", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200
    advs = r.json()
    assert isinstance(advs, list)
    for a in advs:
        assert "booked" in a and "available" in a

    # Student cannot create advisory
    r = requests.post(f"{BASE}/api/advisories", headers=_headers(student_token),
                      json={"subject": "X", "topic": "Y", "date": "Lunes", "time": "10-11"}, timeout=10)
    assert r.status_code == 403

    # Advisor lists own
    r = requests.get(f"{BASE}/api/advisories?mine=true", headers=_headers(advisor_token), timeout=10)
    assert r.status_code == 200

    # Bookings list for student
    r = requests.get(f"{BASE}/api/bookings", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200
    # Incoming for student -> empty list
    r = requests.get(f"{BASE}/api/bookings/incoming", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200 and r.json() == []
    # Incoming for advisor -> list
    r = requests.get(f"{BASE}/api/bookings/incoming", headers=_headers(advisor_token), timeout=10)
    assert r.status_code == 200


def test_regression_subjects_and_tasks(student_token):
    r = requests.get(f"{BASE}/api/subjects", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200
    subs = r.json()
    assert subs, "expected seeded subjects"
    sid = subs[0]["id"]
    r = requests.get(f"{BASE}/api/subjects/{sid}/tasks", headers=_headers(student_token), timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
