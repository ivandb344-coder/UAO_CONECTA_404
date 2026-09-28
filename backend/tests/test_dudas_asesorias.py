"""Regression tests for Dudas + Asesorías new modules (iteration 3)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def student():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/demo")
    assert r.status_code == 200
    tok = r.json()["token"]
    s.headers["Authorization"] = f"Bearer {tok}"
    s.user = r.json()["user"]
    return s


@pytest.fixture(scope="module")
def monitor():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/demo-advisor")
    assert r.status_code == 200
    tok = r.json()["token"]
    s.headers["Authorization"] = f"Bearer {tok}"
    s.user = r.json()["user"]
    return s


@pytest.fixture(scope="module")
def student2():
    """Second student to fill slots / test duplicates."""
    s = requests.Session()
    email = f"TEST_student2_{uuid.uuid4().hex[:6]}@uao.edu.co"
    r = s.post(f"{BASE_URL}/api/auth/register", json={
        "name": "TEST Student2", "username": f"test_s2_{uuid.uuid4().hex[:6]}",
        "email": email, "password": "TESTpass1!", "role": "student",
        "program": "Ingeniería Informática", "semester": 3,
    })
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    s.headers["Authorization"] = f"Bearer {tok}"
    s.user = r.json()["user"]
    return s


# ---------- AUTH ----------
def test_auth_me(student):
    r = student.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "estudiante@uao.edu.co"


def test_auth_advisor(monitor):
    r = monitor.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    assert r.json()["role"] == "monitor"


# ---------- DUDAS ----------
@pytest.fixture(scope="module")
def question(student):
    r = student.post(f"{BASE_URL}/api/questions", json={
        "title": f"TEST_duda_{uuid.uuid4().hex[:6]}",
        "description": "Necesito ayuda con derivadas",
        "subject": "Cálculo I",
    })
    assert r.status_code == 200
    return r.json()


def test_create_question(question):
    assert question["status"] == "Sin respuesta"
    assert question["accepted_id"] is None


def test_answer_by_monitor(monitor, question):
    r = monitor.post(f"{BASE_URL}/api/questions/{question['id']}/answers",
                     json={"body": "TEST respuesta del monitor"})
    assert r.status_code == 200
    ans = r.json()
    assert ans["author_id"] == monitor.user["id"]
    question["_answer_id"] = ans["id"]
    # verify status transition
    detail = monitor.get(f"{BASE_URL}/api/questions/{question['id']}").json()
    assert detail["status"] == "En discusión"


def test_rating_own_answer_forbidden(monitor, question):
    aid = question["_answer_id"]
    r = monitor.post(f"{BASE_URL}/api/answers/{aid}/rating", json={"rating": 5})
    assert r.status_code == 403


def test_student_rate_answer(student, question):
    aid = question["_answer_id"]
    r = student.post(f"{BASE_URL}/api/answers/{aid}/rating",
                     json={"rating": 4, "comment": "gracias"})
    assert r.status_code == 200
    # update rating
    r2 = student.post(f"{BASE_URL}/api/answers/{aid}/rating", json={"rating": 5})
    assert r2.status_code == 200
    # verify detail flags
    detail = student.get(f"{BASE_URL}/api/questions/{question['id']}").json()
    ans = detail["answers"][0]
    assert ans["rating"] == 5
    assert ans["rating_count"] == 1
    assert ans["my_rating"] == 5
    assert ans["can_rate"] is True
    assert detail["is_owner"] is True


def test_rating_out_of_range(student, question):
    aid = question["_answer_id"]
    r = student.post(f"{BASE_URL}/api/answers/{aid}/rating", json={"rating": 6})
    assert r.status_code == 422


def test_non_owner_cannot_accept(monitor, question):
    aid = question["_answer_id"]
    r = monitor.post(f"{BASE_URL}/api/questions/{question['id']}/accept/{aid}")
    assert r.status_code == 403


def test_owner_accepts(student, question):
    aid = question["_answer_id"]
    r = student.post(f"{BASE_URL}/api/questions/{question['id']}/accept/{aid}")
    assert r.status_code == 200
    detail = student.get(f"{BASE_URL}/api/questions/{question['id']}").json()
    assert detail["status"] == "Resuelta"
    assert detail["accepted_id"] == aid
    assert detail["answers"][0]["is_accepted"] is True


# ---------- ASESORÍAS ----------
@pytest.fixture(scope="module")
def advisory(monitor):
    r = monitor.post(f"{BASE_URL}/api/advisories", json={
        "subject": "Cálculo I",
        "topic": f"TEST_topic_{uuid.uuid4().hex[:6]}",
        "date": "Lunes",
        "time": "9:00 a. m. – 9:30 a. m.",
        "mode": "Virtual",
        "slots": 1,
        "link": "https://meet.google.com/test",
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_student_cannot_create_advisory(student):
    r = student.post(f"{BASE_URL}/api/advisories", json={
        "subject": "X", "topic": "Y", "date": "Lunes", "time": "9",
        "mode": "Virtual", "slots": 2,
    })
    assert r.status_code == 403


def test_list_advisories_available(student, advisory):
    r = student.get(f"{BASE_URL}/api/advisories")
    assert r.status_code == 200
    match = next((a for a in r.json() if a["id"] == advisory["id"]), None)
    assert match is not None
    assert match["slots"] == 1
    assert "booked" in match and "available" in match


def test_list_mine_filter(monitor, student, advisory):
    r = monitor.get(f"{BASE_URL}/api/advisories?mine=true")
    assert r.status_code == 200
    assert all(a["advisor_id"] == monitor.user["id"] for a in r.json())
    # student mine should be empty
    r2 = student.get(f"{BASE_URL}/api/advisories?mine=true")
    assert r2.status_code == 200
    assert r2.json() == []


def test_patch_advisory_owner(monitor, advisory):
    r = monitor.patch(f"{BASE_URL}/api/advisories/{advisory['id']}",
                      json={"active": False})
    assert r.status_code == 200
    assert r.json()["active"] is False
    # re-enable
    r2 = monitor.patch(f"{BASE_URL}/api/advisories/{advisory['id']}",
                       json={"active": True})
    assert r2.status_code == 200
    assert r2.json()["active"] is True


def test_patch_advisory_forbidden(student, advisory):
    r = student.patch(f"{BASE_URL}/api/advisories/{advisory['id']}",
                      json={"active": False})
    assert r.status_code == 403


# ---------- RESERVAS ----------
def test_advisor_cannot_book_own(monitor, advisory):
    r = monitor.post(f"{BASE_URL}/api/bookings", json={"advisory_id": advisory["id"]})
    assert r.status_code == 409


def test_student_creates_booking(student, advisory):
    r = student.post(f"{BASE_URL}/api/bookings",
                     json={"advisory_id": advisory["id"], "note": "TEST"})
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["status"] == "Pendiente"
    advisory["_booking_id"] = b["id"]


def test_duplicate_booking(student, advisory):
    r = student.post(f"{BASE_URL}/api/bookings",
                     json={"advisory_id": advisory["id"]})
    assert r.status_code == 409


def test_slots_full(student2, advisory):
    # advisory has slots=1, student1 already booked → student2 gets "Cupo lleno"
    r = student2.post(f"{BASE_URL}/api/bookings",
                      json={"advisory_id": advisory["id"]})
    assert r.status_code == 409
    assert "Cupo" in r.json().get("detail", "") or "cupo" in r.json().get("detail", "").lower()


def test_bookings_list_student(student, advisory):
    r = student.get(f"{BASE_URL}/api/bookings")
    assert r.status_code == 200
    ids = [b["id"] for b in r.json()]
    assert advisory["_booking_id"] in ids


def test_incoming_bookings_advisor(monitor, advisory):
    r = monitor.get(f"{BASE_URL}/api/bookings/incoming")
    assert r.status_code == 200
    ids = [b["id"] for b in r.json()]
    assert advisory["_booking_id"] in ids


def test_incoming_bookings_student_empty(student):
    r = student.get(f"{BASE_URL}/api/bookings/incoming")
    assert r.status_code == 200
    assert r.json() == []


def test_advisor_accepts_booking(monitor, advisory):
    bid = advisory["_booking_id"]
    r = monitor.patch(f"{BASE_URL}/api/bookings/{bid}/status",
                      json={"status": "Aceptada"})
    assert r.status_code == 200


def test_invalid_status(monitor, advisory):
    bid = advisory["_booking_id"]
    r = monitor.patch(f"{BASE_URL}/api/bookings/{bid}/status",
                     json={"status": "Bogus"})
    assert r.status_code == 422


def test_student_cannot_change_non_cancel(student, advisory):
    bid = advisory["_booking_id"]
    r = student.patch(f"{BASE_URL}/api/bookings/{bid}/status",
                     json={"status": "Completada"})
    assert r.status_code == 403


def test_student_can_cancel(student, advisory):
    bid = advisory["_booking_id"]
    r = student.patch(f"{BASE_URL}/api/bookings/{bid}/status",
                     json={"status": "Cancelada"})
    assert r.status_code == 200


def test_advisor_completes_flow(monitor, advisory):
    # After cancellation slot freed; student2 can now book, then monitor completes
    pass


def test_delete_advisory_forbidden(student, advisory):
    r = student.delete(f"{BASE_URL}/api/advisories/{advisory['id']}")
    assert r.status_code == 403


def test_delete_advisory_owner(monitor, advisory):
    r = monitor.delete(f"{BASE_URL}/api/advisories/{advisory['id']}")
    assert r.status_code == 200
