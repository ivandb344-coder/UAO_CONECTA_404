import os
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def test_core_authenticated_flows():
    s = requests.Session()
    demo = s.post(f"{BASE_URL}/api/auth/demo")
    assert demo.status_code == 200
    s.headers["Authorization"] = f"Bearer {demo.json()['token']}"
    dashboard = s.get(f"{BASE_URL}/api/dashboard")
    assert dashboard.status_code == 200
    assert "subjects" in dashboard.json() and "stats" in dashboard.json()
    title = "TEST_regression_question"
    created = s.post(f"{BASE_URL}/api/questions", json={"title": title, "description": "TEST description", "subject": "Cálculo I", "tags": [], "anonymous": False})
    assert created.status_code == 200
    assert created.json()["title"] == title
    listed = s.get(f"{BASE_URL}/api/questions")
    assert listed.status_code == 200
    assert any(q["id"] == created.json()["id"] for q in listed.json())
    chat = s.post(f"{BASE_URL}/api/chat", json={"body": "TEST chat", "room": "general"})
    assert chat.status_code == 200
    assert chat.json()["body"] == "TEST chat"