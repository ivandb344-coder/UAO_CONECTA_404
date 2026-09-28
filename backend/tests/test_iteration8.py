"""Iteration 8 — persistent session/role, unique email, accessibility prefs, refactor regression."""
import os, uuid, asyncio, json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

EMAIL_TAKEN = "Este correo electrónico ya está registrado. Inicia sesión con esta cuenta."


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def student_token(s):
    r = s.post(f"{API}/auth/demo")
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def monitor_token(s):
    r = s.post(f"{API}/auth/demo-advisor")
    assert r.status_code == 200
    return r.json()["token"]


# ---------- Persistent session/role + unique email ----------
class TestRegisterAndLogin:
    prof_email = f"test_prof_{uuid.uuid4().hex[:8]}@uao.edu.co"
    prof_pass = "SuperSecret123"
    prof_username = f"prof_{uuid.uuid4().hex[:6]}"

    def test_register_professor(self, s):
        payload = {
            "name": "Prof Test",
            "username": self.prof_username,
            "email": self.prof_email,
            "password": self.prof_pass,
            "role": "professor",
            "program": "Ingeniería Informática",
        }
        r = s.post(f"{API}/auth/register", json=payload)
        assert r.status_code in (200, 201), r.text
        data = r.json()
        assert "token" in data
        user = data["user"]
        assert user["role"] == "professor"
        assert user["program"] == "Ingeniería Informática"
        assert user["username"] == self.prof_username
        acc = user["preferences"]["accessibility"]
        assert acc["contrast"] == "normal"
        assert acc["text_size"] == "normal"
        assert acc["animations"] is True
        TestRegisterAndLogin.prof_token = data["token"]

    def test_login_uppercase_email_preserves_role(self, s):
        r = s.post(f"{API}/auth/login", json={"email": self.prof_email.upper(), "password": self.prof_pass})
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["role"] == "professor"
        assert u["username"] == self.prof_username

    def test_me_returns_same(self, s):
        h = {"Authorization": f"Bearer {TestRegisterAndLogin.prof_token}"}
        r = s.get(f"{API}/auth/me", headers=h)
        assert r.status_code == 200
        u = r.json()
        assert u["role"] == "professor"
        assert u["program"] == "Ingeniería Informática"

    def test_duplicate_email_same_case(self, s):
        payload = {
            "name": "Other",
            "username": f"other_{uuid.uuid4().hex[:6]}",
            "email": self.prof_email,
            "password": "otherpass1",
            "role": "monitor",
            "program": "Ingeniería Informática",
        }
        r = s.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 409
        assert r.json().get("detail") == EMAIL_TAKEN

    def test_duplicate_email_different_case(self, s):
        payload = {
            "name": "Other2",
            "username": f"other_{uuid.uuid4().hex[:6]}",
            "email": self.prof_email.upper(),
            "password": "otherpass1",
            "role": "monitor",
            "program": "Ingeniería Informática",
        }
        r = s.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 409
        assert r.json().get("detail") == EMAIL_TAKEN

    def test_email_available_precheck(self, s):
        r = s.get(f"{API}/auth/email-available", params={"email": self.prof_email})
        assert r.status_code == 200
        assert r.json() == {"available": False, "reason": EMAIL_TAKEN}
        fresh = f"fresh_{uuid.uuid4().hex[:8]}@uao.edu.co"
        r2 = s.get(f"{API}/auth/email-available", params={"email": fresh})
        assert r2.status_code == 200
        assert r2.json()["available"] is True

    def test_student_missing_semester(self, s):
        payload = {
            "name": "Stu",
            "username": f"stu_{uuid.uuid4().hex[:6]}",
            "email": f"stu_{uuid.uuid4().hex[:8]}@uao.edu.co",
            "password": "abcdef",
            "role": "student",
            "program": "Ingeniería Informática",
        }
        r = s.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 422
        detail = r.json().get("detail", {})
        assert "semester" in detail.get("fields", {})

    def test_short_password(self, s):
        payload = {
            "name": "Stu",
            "username": f"stu_{uuid.uuid4().hex[:6]}",
            "email": f"stu_{uuid.uuid4().hex[:8]}@uao.edu.co",
            "password": "abc",
            "role": "monitor",
            "program": "Ingeniería Informática",
        }
        r = s.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 422
        detail = r.json().get("detail", {})
        assert "password" in detail.get("fields", {})


# ---------- Preferences ----------
class TestPreferences:
    def test_patch_and_get(self, s, student_token):
        h = {"Authorization": f"Bearer {student_token}"}
        payload = {
            "contrast": "high", "text_size": "xlarge", "animations": False,
            "reduced_motion": True, "focus_visible": True, "large_controls": True,
        }
        r = s.patch(f"{API}/profile/preferences", json=payload, headers=h)
        assert r.status_code == 200, r.text
        acc = r.json()["accessibility"]
        for k, v in payload.items():
            assert acc[k] == v

        r2 = s.get(f"{API}/profile/preferences", headers=h)
        assert r2.status_code == 200
        acc2 = r2.json()["accessibility"]
        assert acc2["contrast"] == "high"
        assert acc2["text_size"] == "xlarge"

        r3 = s.get(f"{API}/auth/me", headers=h)
        assert r3.status_code == 200
        assert r3.json()["preferences"]["accessibility"]["contrast"] == "high"

        # Reset back
        reset = {"contrast": "normal", "text_size": "normal", "animations": True,
                 "reduced_motion": False, "focus_visible": False, "large_controls": False}
        s.patch(f"{API}/profile/preferences", json=reset, headers=h)

    def test_invalid_contrast(self, s, student_token):
        h = {"Authorization": f"Bearer {student_token}"}
        r = s.patch(f"{API}/profile/preferences", json={"contrast": "neon"}, headers=h)
        assert r.status_code == 422
        assert "contrast" in r.json()["detail"]["fields"]

    def test_invalid_text_size(self, s, student_token):
        h = {"Authorization": f"Bearer {student_token}"}
        r = s.patch(f"{API}/profile/preferences", json={"text_size": "huge"}, headers=h)
        assert r.status_code == 422
        assert "text_size" in r.json()["detail"]["fields"]


# ---------- Google fake session ----------
class TestGoogleAuth:
    def test_fake_session_401(self, s):
        r = s.post(f"{API}/auth/google", json={"session_id": "fake-not-real-xyz"})
        assert r.status_code == 401


# ---------- Refactor regression ----------
class TestRegression:
    def test_endpoints_student(self, s, student_token):
        h = {"Authorization": f"Bearer {student_token}"}
        endpoints = [
            "/dashboard", "/subjects", "/questions", "/advisories", "/bookings",
            "/chat/summary", "/chat/general", "/notifications", "/saved",
            "/search?q=calc", "/people", "/programs",
        ]
        for ep in endpoints:
            r = s.get(f"{API}{ep}", headers=h)
            assert r.status_code == 200, f"{ep}: {r.status_code} {r.text[:200]}"

    def test_submissions_forbidden_student(self, s, student_token):
        h = {"Authorization": f"Bearer {student_token}"}
        r = s.get(f"{API}/submissions/incoming", headers=h)
        assert r.status_code == 403

    def test_monitor_endpoints(self, s, monitor_token):
        h = {"Authorization": f"Bearer {monitor_token}"}
        for ep in ["/bookings/incoming", "/submissions/incoming"]:
            r = s.get(f"{API}{ep}", headers=h)
            assert r.status_code == 200, f"{ep}: {r.status_code}"

    def test_subject_tasks_and_resources(self, s, student_token):
        h = {"Authorization": f"Bearer {student_token}"}
        r = s.get(f"{API}/subjects", headers=h)
        assert r.status_code == 200
        subjects = r.json()
        assert len(subjects) > 0
        sid = subjects[0]["id"]
        rt = s.get(f"{API}/subjects/{sid}/tasks", headers=h)
        rr = s.get(f"{API}/subjects/{sid}/resources", headers=h)
        assert rt.status_code == 200
        assert rr.status_code == 200

    def test_file_upload_and_get(self, s, student_token):
        h = {"Authorization": f"Bearer {student_token}"}
        files = {"file": ("test.txt", b"hello world", "text/plain")}
        r = s.post(f"{API}/files", files=files, headers=h)
        assert r.status_code == 200, r.text
        path = r.json().get("storage_path") or r.json().get("path")
        assert path
        r2 = s.get(f"{API}/files/{path}", headers=h)
        assert r2.status_code == 200
        assert r2.content == b"hello world"


# ---------- WebSocket presence ----------
class TestWebSocket:
    def test_ws_chat_general(self, student_token):
        try:
            from websockets.sync.client import connect
        except ImportError:
            pytest.skip("websockets not installed")
        import urllib.parse
        ws_base = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        url = f"{ws_base}/api/ws/chat/general?token={urllib.parse.quote(student_token)}"
        try:
            with connect(url, open_timeout=10) as ws:
                msg = ws.recv(timeout=5)
                # first message should be presence
                assert msg
                data = json.loads(msg)
                assert "type" in data
        except Exception as e:
            pytest.fail(f"WS connect failed: {e}")
