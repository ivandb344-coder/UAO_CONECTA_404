"""Iteration 8 — Auth + CORS + regression tests for UAO Conecta.

Tests the current auth endpoints (register/login/me/google/forgot/reset),
CORS behavior, and simple regression on authenticated resources.
"""
import os
import uuid
import time

import pytest
import requests


def _load_backend_url():
    val = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if val:
        return val.rstrip("/")
    try:
        with open("/app/frontend/.env") as fh:
            for line in fh:
                line = line.strip()
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    except FileNotFoundError:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

MONITOR_EMAIL = "monitor@uao.edu.co"
MONITOR_PASS = "UAOdemo2026!"

GH_PAGES = "https://ivandb344-coder.github.io"
GH_PAGES_URL = "https://ivandb344-coder.github.io/UAO_CONECTA_404/"


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def new_student(s):
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "name": f"TEST Student {suffix}",
        "username": f"teststu_{suffix}",
        "email": f"test_stu_{suffix}@uao.edu.co",
        "password": "SecretPass!23",
        "role": "student",
        "program": "Ingeniería Informática",
        "semester": 3,
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    return {"payload": payload, "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="module")
def monitor_token(s):
    r = s.post(f"{API}/auth/login", json={"email": MONITOR_EMAIL, "password": MONITOR_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ---------- Health ----------

def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_health(s):
    r = s.get(f"{API}/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ok"
    assert body.get("database") is True


# ---------- Register ----------

def test_register_ok(new_student):
    u = new_student["user"]
    assert u["email"] == new_student["payload"]["email"]
    assert u.get("profile_completed") is True
    # UUID check
    uuid.UUID(u["id"])
    assert new_student["token"]


def test_register_duplicate_email(s, new_student):
    payload = dict(new_student["payload"])
    payload["username"] = f"dup_{uuid.uuid4().hex[:6]}"
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 409
    assert isinstance(r.json().get("detail"), str)


def test_register_invalid_fields(s):
    r = s.post(f"{API}/auth/register", json={
        "name": "x",
        "username": "ab",
        "email": f"bad_{uuid.uuid4().hex[:6]}@uao.edu.co",
        "password": "123",
        "role": "student",
        "program": "Ingeniería Informática",
        "semester": 3,
    })
    assert r.status_code == 422
    detail = r.json().get("detail")
    assert isinstance(detail, dict)
    assert "fields" in detail
    assert set(detail["fields"].keys()) & {"name", "username", "password"}


# ---------- Login ----------

def test_login_monitor_seed(monitor_token):
    assert monitor_token


def test_login_case_insensitive(s, new_student):
    r = s.post(f"{API}/auth/login", json={
        "email": new_student["payload"]["email"].upper(),
        "password": new_student["payload"]["password"],
    })
    assert r.status_code == 200
    assert r.json()["user"]["email"] == new_student["payload"]["email"]


def test_login_wrong_password(s):
    r = s.post(f"{API}/auth/login", json={"email": MONITOR_EMAIL, "password": "wrong-pw"})
    assert r.status_code == 401
    assert isinstance(r.json().get("detail"), str)


# ---------- Me ----------

def test_me_with_token(s, new_student):
    r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {new_student['token']}"})
    assert r.status_code == 200
    assert r.json()["email"] == new_student["payload"]["email"]


def test_me_without_token(s):
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---------- Email available ----------

def test_email_available_existing(s):
    r = s.get(f"{API}/auth/email-available", params={"email": MONITOR_EMAIL})
    assert r.status_code == 200
    body = r.json()
    assert body["available"] is False
    assert "reason" in body


def test_email_available_new(s):
    r = s.get(f"{API}/auth/email-available", params={"email": f"free_{uuid.uuid4().hex[:6]}@uao.edu.co"})
    assert r.status_code == 200
    assert r.json()["available"] is True


# ---------- Google ----------

def test_google_login_default_redirect():
    r = requests.get(f"{API}/auth/google/login", allow_redirects=False)
    assert r.status_code == 302
    loc = r.headers["Location"]
    assert loc.startswith("https://auth.emergentagent.com/")
    assert "redirect=https%3A%2F%2Fivandb344-coder.github.io%2FUAO_CONECTA_404%2F" in loc


def test_google_login_authorized_redirect():
    r = requests.get(f"{API}/auth/google/login", params={"redirect": GH_PAGES_URL}, allow_redirects=False)
    assert r.status_code == 302
    loc = r.headers["Location"]
    assert "redirect=https%3A%2F%2Fivandb344-coder.github.io%2FUAO_CONECTA_404%2F" in loc


def test_google_login_unauthorized_redirect_falls_back():
    r = requests.get(f"{API}/auth/google/login", params={"redirect": "https://evil.com/"}, allow_redirects=False)
    assert r.status_code == 302
    loc = r.headers["Location"]
    assert "evil.com" not in loc
    assert "ivandb344-coder.github.io" in loc


def test_google_login_strips_fragment():
    r = requests.get(f"{API}/auth/google/login",
                     params={"redirect": GH_PAGES_URL + "#session_id=xxx"},
                     allow_redirects=False)
    assert r.status_code == 302
    loc = r.headers["Location"]
    # The fragment must not be present in the encoded redirect (encoded '#' is %23)
    assert "%23session_id" not in loc


def test_google_post_invalid_session():
    r = requests.post(f"{API}/auth/google", json={"session_id": "definitely-fake-xyz-0001"})
    assert r.status_code == 401
    assert isinstance(r.json().get("detail"), str)


def test_google_post_blank_session():
    r = requests.post(f"{API}/auth/google", json={"session_id": "   "})
    assert r.status_code == 400
    assert isinstance(r.json().get("detail"), str)


# ---------- Forgot / reset ----------

def test_forgot_password_smtp_unavailable(s):
    r = s.post(f"{API}/auth/forgot-password", json={"email": MONITOR_EMAIL})
    assert r.status_code == 503
    assert isinstance(r.json().get("detail"), str)


def test_forgot_password_invalid_email(s):
    r = s.post(f"{API}/auth/forgot-password", json={"email": "nope"})
    assert r.status_code == 400


def test_reset_password_bogus_token(s):
    r = s.post(f"{API}/auth/reset-password", json={"token": "bogus-not-a-real-token", "password": "abcdefgh"})
    assert r.status_code == 400


def test_reset_password_short(s):
    r = s.post(f"{API}/auth/reset-password", json={"token": "whatever", "password": "abc"})
    assert r.status_code == 400


# ---------- CORS ----------

def _preflight(origin):
    return requests.options(f"{API}/auth/login", headers={
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
    })


def test_cors_gh_pages_allowed():
    r = _preflight(GH_PAGES)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == GH_PAGES
    assert r.headers.get("access-control-allow-credentials", "").lower() == "true"


def test_cors_localhost_allowed():
    r = _preflight("http://localhost:3000")
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_evil_rejected():
    r = _preflight("https://evil.com")
    assert r.status_code == 400
    assert "access-control-allow-origin" not in {k.lower() for k in r.headers.keys()}


# ---------- Regression on authenticated endpoints ----------

@pytest.mark.parametrize("path", [
    "/dashboard",
    "/subjects",
    "/questions",
    "/advisories",
    "/notifications",
    "/chat/summary",
])
def test_authenticated_get(s, new_student, path):
    r = s.get(f"{API}{path}", headers={"Authorization": f"Bearer {new_student['token']}"})
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"


def test_patch_profile_me(s, new_student):
    r = s.patch(f"{API}/profile/me",
                headers={"Authorization": f"Bearer {new_student['token']}"},
                json={"bio": "Actualizado por test iteration 8"})
    assert r.status_code == 200, r.text
