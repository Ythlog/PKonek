"""API tests that don't need a database (dependencies overridden)."""
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from accounts_complaints.db import get_db
from accounts_complaints.deps import RateLimiter, get_current_user, get_optional_user
from accounts_complaints.services import complaints as complaint_service
from accounts_complaints.standalone_main import app


class FakeDB:
    def __getattr__(self, name):
        raise AssertionError(f"database should not be touched (called db.{name})")


def fake_user(role):
    return SimpleNamespace(id=7, role=role, is_active=True, email="x@pasig.gov.ph")


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = lambda: FakeDB()
    yield TestClient(app)
    app.dependency_overrides.clear()


def as_user(role):
    app.dependency_overrides[get_current_user] = lambda: fake_user(role)
    app.dependency_overrides[get_optional_user] = lambda: fake_user(role)


VALID = {
    "category_id": 1, "title": "Pothole", "description": "Big pothole near the church",
    "latitude": 14.5764, "longitude": 121.0851,
}


def test_create_complaint_missing_pin_is_422(client):
    body = {k: v for k, v in VALID.items() if k not in ("latitude", "longitude")}
    r = client.post("/complaints", json=body)
    assert r.status_code == 422


def test_create_complaint_outside_pasig_is_422(client):
    r = client.post("/complaints", json={**VALID, "latitude": 14.5995, "longitude": 120.9842})  # Manila
    assert r.status_code == 422
    assert "outside Pasig" in r.json()["detail"]


def test_list_complaints_requires_login(client):
    assert client.get("/complaints").status_code == 401


def test_official_cannot_manage_users_or_view_logs(client):
    as_user("official")
    assert client.get("/users").status_code == 403
    assert client.post("/users", json={"email": "a@b.ph", "password": "longenough", "full_name": "A"}).status_code == 403
    assert client.get("/logs/audit").status_code == 403
    assert client.post("/categories", json={"code": "abc", "name": "ABC"}).status_code == 403


def test_bad_bbox_rejected(client):
    as_user("official")
    assert client.get("/complaints", params={"min_lat": 14.5}).status_code == 400


def _fake_complaint():
    now = datetime(2026, 11, 13, 8, 0, 0)
    return SimpleNamespace(
        id=1, reference_no="PSG-2026-000001", category_id=1, title="Pothole", description="Big pothole",
        status="open", latitude=14.5764, longitude=121.0851, address_text=None, barangay="Kapitolyo",
        photo_url=None, report_count=1, created_at=now, updated_at=now, resolved_at=None,
        reporter_name="Juan", reporter_contact="09171234567", created_by_user_id=None,
    )


def test_reporter_contact_hidden_from_public(client, monkeypatch):
    monkeypatch.setattr(complaint_service, "get_complaint", lambda db, cid: _fake_complaint())
    app.dependency_overrides[get_optional_user] = lambda: None
    public = client.get("/complaints/1").json()
    assert "reporter_contact" not in public and public["reference_no"] == "PSG-2026-000001"

    as_user("official")
    staff = client.get("/complaints/1").json()
    assert staff["reporter_contact"] == "09171234567"


def test_rate_limiter_window():
    limiter = RateLimiter(limit_per_minute=2)
    assert limiter.hit("1.1.1.1", now=0)
    assert limiter.hit("1.1.1.1", now=1)
    assert not limiter.hit("1.1.1.1", now=2)
    assert limiter.hit("2.2.2.2", now=2)
    assert limiter.hit("1.1.1.1", now=61)


def test_all_routes_registered():
    paths = set(app.openapi()["paths"])
    for p in [
        "/auth/login", "/auth/logout", "/auth/me", "/users", "/users/{user_id}",
        "/logs/activity", "/logs/audit", "/categories", "/categories/{category_id}",
        "/complaints", "/complaints/check-duplicates", "/complaints/{complaint_id}",
        "/complaints/{complaint_id}/support", "/complaints/{complaint_id}/status",
    ]:
        assert p in paths, p


def test_status_transitions():
    t = complaint_service.ALLOWED_TRANSITIONS
    assert "resolved" in t["open"] and "in_progress" in t["open"]
    assert t["resolved"] == set() and "open" not in t["in_progress"]
