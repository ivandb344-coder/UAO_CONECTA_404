"""Iteration 6 backend tests: avatar visibility, teacher review tray, google auth 401,
   incomplete profile JWT flow, non-reviewer permissions."""
import io
import os
import time
import uuid

import jwt as pyjwt
import pytest
import requests

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if url:
        return url.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"
JWT_SECRET = "uao-conecta-development-secret"


def _png_bytes():
    # Minimal 1x1 PNG
    import base64
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    )


@pytest.fixture(scope="module")
def student_token():
    r = requests.post(f"{API}/auth/demo", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def monitor_token():
    r = requests.post(f"{API}/auth/demo-advisor", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def outsider_monitor_token():
    """Fresh monitor registered — should NOT be able to review demo-monitor's submissions."""
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "name": f"TEST Outsider {suffix}",
        "username": f"test_out_{suffix}",
        "email": f"test_outsider_{suffix}@uao.edu.co",
        "password": "OutsiderPass1!",
        "role": "monitor",
        "program": "Ingeniería Informática",
        "semester": None,
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- 1) Demo auth ----------
def test_demo_login_tokens(student_token, monitor_token):
    assert student_token and monitor_token


# ---------- 2) Avatar upload + cross-role visibility ----------
def test_avatar_upload_and_visibility(student_token, monitor_token):
    files = {"file": ("avatar.png", _png_bytes(), "image/png")}
    r = requests.post(f"{API}/profile/photo", headers=H(student_token), files=files, timeout=15)
    assert r.status_code == 200, r.text
    picture = r.json().get("picture")
    assert picture and picture.startswith("/api/files/"), f"unexpected picture: {picture}"
    url = f"{BASE_URL}{picture}"

    # student can view own avatar
    r1 = requests.get(url, headers=H(student_token), timeout=10)
    assert r1.status_code == 200, r1.text

    # monitor (any authenticated user) can view avatar
    r2 = requests.get(url, headers=H(monitor_token), timeout=10)
    assert r2.status_code == 200, r2.text

    # no token -> 401/403
    r3 = requests.get(url, timeout=10)
    assert r3.status_code in (401, 403), r3.text


# ---------- 3) Student submission + incoming for monitor ----------
@pytest.fixture(scope="module")
def student_submission(student_token, monitor_token):
    # upload a file
    files = {"file": ("entrega.png", _png_bytes(), "image/png")}
    r = requests.post(f"{API}/files", headers=H(student_token), files=files, timeout=15)
    assert r.status_code == 200, r.text
    file_id = r.json().get("id") or r.json().get("file_id")
    assert file_id

    # submit
    payload = {"text": "TEST_iter6 entrega", "file_id": file_id}
    r = requests.post(f"{API}/tasks/task-demo-1/submissions", headers=H(student_token),
                      json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    sub = r.json()
    return sub


def test_incoming_as_monitor_and_forbidden_as_student(student_submission, monitor_token, student_token):
    r = requests.get(f"{API}/submissions/incoming", headers=H(monitor_token), timeout=15)
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list) and len(items) >= 1
    match = next((i for i in items if i["id"] == student_submission["id"]), None)
    assert match, "student submission not present in incoming list"
    assert match.get("task", {}).get("title")
    assert match.get("subject", {}).get("name") and match.get("subject", {}).get("code")
    fmeta = match.get("file")
    assert fmeta and fmeta.get("storage_path") and fmeta.get("name") and fmeta.get("content_type")

    # student cannot access incoming
    rs = requests.get(f"{API}/submissions/incoming", headers=H(student_token), timeout=10)
    assert rs.status_code == 403, rs.text


def test_monitor_can_download_submission_file(student_submission, monitor_token):
    fmeta = None
    r = requests.get(f"{API}/submissions/incoming", headers=H(monitor_token), timeout=15).json()
    match = next((i for i in r if i["id"] == student_submission["id"]), None)
    assert match
    fmeta = match["file"]
    sp = fmeta["storage_path"]
    url = f"{API}{sp}" if sp.startswith("/") else f"{API}/files/{sp}"
    rf = requests.get(url, headers=H(monitor_token), timeout=15)
    assert rf.status_code == 200, rf.text


def test_monitor_feedback_and_student_sees_status(student_submission, monitor_token, student_token):
    sid = student_submission["id"]
    payload = {"feedback": "TEST_iter6 buen trabajo", "grade": 4.7, "status": "Aprobada"}
    r = requests.patch(f"{API}/submissions/{sid}/feedback", headers=H(monitor_token),
                       json=payload, timeout=15)
    assert r.status_code == 200, r.text
    updated = r.json()
    assert updated.get("status") == "Aprobada"
    assert updated.get("feedback") == "TEST_iter6 buen trabajo"

    # get subject_id from task-demo-1
    tasks = requests.get(f"{API}/submissions/incoming", headers=H(monitor_token), timeout=10).json()
    match = next(i for i in tasks if i["id"] == sid)
    subject_id = match["subject"].get("id") or match["subject"].get("_id")
    if not subject_id:
        # fallback: find via subjects list
        subs = requests.get(f"{API}/subjects", headers=H(student_token), timeout=10).json()
        target_code = match["subject"]["code"]
        subject_id = next(s["id"] for s in subs if s.get("code") == target_code)

    # student view
    rs = requests.get(f"{API}/subjects/{subject_id}/tasks", headers=H(student_token), timeout=15)
    assert rs.status_code == 200, rs.text
    tasks_list = rs.json()
    t = next((tt for tt in tasks_list if tt["id"] == "task-demo-1"), None)
    assert t, "task-demo-1 not found for student"
    sub = t.get("submission")
    assert sub and sub.get("status") == "Aprobada"
    assert sub.get("file") and sub["file"].get("name")

    # monitor view includes submissions_count
    rm = requests.get(f"{API}/subjects/{subject_id}/tasks", headers=H(monitor_token), timeout=10)
    assert rm.status_code == 200
    tm = next(tt for tt in rm.json() if tt["id"] == "task-demo-1")
    assert "submissions_count" in tm and tm["submissions_count"] >= 1


# ---------- 4) Non-reviewer monitor forbidden ----------
def test_outsider_monitor_forbidden(student_submission, outsider_monitor_token):
    sid = student_submission["id"]
    # try feedback -> 403
    r = requests.patch(f"{API}/submissions/{sid}/feedback", headers=H(outsider_monitor_token),
                       json={"feedback": "x", "grade": 3, "status": "Aprobada"}, timeout=10)
    assert r.status_code == 403, r.text

    # try to download submission file -> 403
    incoming = requests.get(f"{API}/submissions/incoming",
                            headers=H(outsider_monitor_token), timeout=10).json()
    # outsider incoming should not contain the demo-monitor task
    assert not any(i["id"] == sid for i in incoming)

    # obtain storage_path via monitor session
    from_monitor = requests.post(f"{API}/auth/demo-advisor", timeout=10).json()["token"]
    inc = requests.get(f"{API}/submissions/incoming", headers=H(from_monitor), timeout=10).json()
    match = next(i for i in inc if i["id"] == sid)
    sp = match["file"]["storage_path"]
    url = f"{API}{sp}" if sp.startswith("/") else f"{API}/files/{sp}"
    rf = requests.get(url, headers=H(outsider_monitor_token), timeout=10)
    assert rf.status_code == 403, f"expected 403, got {rf.status_code}: {rf.text}"


# ---------- 5) Google auth invalid + incomplete JWT ----------
def test_google_auth_invalid_session():
    r = requests.post(f"{API}/auth/google", json={"session_id": "definitely-not-real"}, timeout=20)
    assert r.status_code == 401, r.text


def test_incomplete_profile_jwt_returns_profile_completed_false():
    # ensure user exists in db by trying google flow won't work; instead register a synthetic user
    # via direct DB is not accessible; but backend probably returns 404 if user missing.
    # Try both variants: sub='google-incomplete' with pre-seeded user, else document behavior.
    payload = {"sub": "google-incomplete", "exp": int(time.time()) + 3600}
    tok = pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")
    r = requests.get(f"{API}/auth/me", headers=H(tok), timeout=10)
    if r.status_code == 404:
        pytest.skip("google-incomplete user not seeded; backend returns 404")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("profile_completed") is False, body
