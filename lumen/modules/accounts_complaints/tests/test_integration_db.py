"""End-to-end tests against a real MySQL 8 database that already has schema.sql applied.

Skipped unless TEST_DATABASE_URL is set, e.g.
    $env:TEST_DATABASE_URL = "mysql+pymysql://avnadmin:...@host:port/lumen_test"
Use a separate test database: rows are created and then deleted.
"""
import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, text

pytestmark = pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="TEST_DATABASE_URL not set")

LAT, LNG = 14.5764, 121.0851
M_PER_DEG = 111_320.0


@pytest.fixture(scope="module")
def env():
    from accounts_complaints.db import get_sessionmaker
    from accounts_complaints.models import (
        AccountActivityLog, AuditLog, Complaint, ComplaintCategory, ComplaintSupport, User,
    )
    from accounts_complaints.security import hash_password
    from accounts_complaints.standalone_main import app

    tag = uuid.uuid4().hex[:8]
    with get_sessionmaker()() as db:
        admin = User(email=f"admin_{tag}@test.local", password_hash=hash_password("adminpass1"),
                     full_name="Test Admin", role="pasig_admin", is_active=True)
        cat_a = ComplaintCategory(code=f"t_{tag}_a", name="Test A")
        cat_b = ComplaintCategory(code=f"t_{tag}_b", name="Test B")
        db.add_all([admin, cat_a, cat_b])
        db.commit()
        ids = {"admin": admin.id, "email": admin.email, "cat_a": cat_a.id, "cat_b": cat_b.id}

    client = TestClient(app)
    token = client.post("/auth/login", json={"email": ids["email"], "password": "adminpass1"}).json()["access_token"]
    ids["headers"] = {"Authorization": f"Bearer {token}"}
    yield client, ids

    with get_sessionmaker()() as db:
        cids = db.scalars(select(Complaint.id).where(Complaint.category_id.in_([ids["cat_a"], ids["cat_b"]]))).all()
        if cids:
            db.execute(delete(ComplaintSupport).where(ComplaintSupport.complaint_id.in_(cids)))
            db.execute(delete(AuditLog).where(AuditLog.entity_type == "complaint", AuditLog.entity_id.in_(cids)))
            db.execute(delete(Complaint).where(Complaint.id.in_(cids)))
        db.execute(delete(AuditLog).where(AuditLog.actor_user_id == ids["admin"]))
        db.execute(delete(AccountActivityLog).where(AccountActivityLog.email.like(f"%{tag}%")))
        db.execute(delete(ComplaintCategory).where(ComplaintCategory.id.in_([ids["cat_a"], ids["cat_b"]])))
        db.execute(delete(User).where(User.email.like(f"%{tag}%")))
        db.commit()


def body(cat, dlat_m=0.0, **extra):
    return {"category_id": cat, "title": "Pothole test", "description": "Integration test complaint",
            "latitude": LAT + dlat_m / M_PER_DEG, "longitude": LNG, **extra}


def test_schema_tables_exist(env):
    from accounts_complaints.db import get_engine
    with get_engine().connect() as conn:
        tables = set(conn.execute(text("SHOW TABLES")).scalars())
    assert {"users", "account_activity_logs", "audit_logs", "complaint_categories",
            "complaints", "complaint_supports"} <= tables


def test_failed_login_is_logged(env):
    client, ids = env
    assert client.post("/auth/login", json={"email": ids["email"], "password": "wrong-pass"}).status_code == 401
    r = client.get("/logs/activity", params={"email": ids["email"], "action": "login_failed"}, headers=ids["headers"])
    assert r.json()["total"] >= 1


def test_duplicate_flow(env):
    client, ids = env
    a, b = ids["cat_a"], ids["cat_b"]

    first = client.post("/complaints", json=body(a, reporter_contact="0917-first"))
    assert first.status_code == 201, first.text
    first = first.json()
    assert first["reference_no"].startswith("PSG-")

    preview = client.post("/complaints/check-duplicates", json={"category_id": a, "latitude": LAT + 20 / M_PER_DEG, "longitude": LNG})
    assert preview.json()["is_duplicate"] is True

    dup = client.post("/complaints", json=body(a, 30))
    assert dup.status_code == 409
    assert dup.json()["detail"]["candidates"][0]["id"] == first["id"]

    assert client.post("/complaints", json=body(a, 80)).status_code == 201       # outside 50 m
    assert client.post("/complaints", json=body(b, 10)).status_code == 201       # other category

    sup = client.post(f"/complaints/{first['id']}/support",
                      json={"latitude": LAT + 10 / M_PER_DEG, "longitude": LNG, "reporter_contact": "0917-second"})
    assert sup.status_code == 200, sup.text
    assert sup.json()["report_count"] == 2
    again = client.post(f"/complaints/{first['id']}/support",
                        json={"latitude": LAT, "longitude": LNG, "reporter_contact": "0917-second"})
    assert again.status_code == 409

    # Resolve the original; a new report at the same spot is now allowed.
    h = ids["headers"]
    assert client.patch(f"/complaints/{first['id']}/status", json={"status": "resolved"}, headers=h).status_code == 200
    assert client.patch(f"/complaints/{first['id']}/status", json={"status": "open"}, headers=h).status_code == 400
    assert client.post("/complaints", json=body(a, 5)).status_code == 201

    trail = client.get("/logs/audit", params={"entity_type": "complaint", "entity_id": first["id"]}, headers=h).json()
    actions = {row["action"] for row in trail["items"]}
    assert {"create", "support", "status_change"} <= actions


def test_filters(env):
    client, ids = env
    h = ids["headers"]
    r = client.get("/complaints", params={"category_id": ids["cat_a"], "status": "open"}, headers=h).json()
    assert r["total"] >= 1 and all(c["status"] == "open" for c in r["items"])
    near = client.get("/complaints", params={"category_id": ids["cat_a"], "near_lat": LAT, "near_lng": LNG, "radius_m": 40}, headers=h).json()
    assert all(abs(c["latitude"] - LAT) * M_PER_DEG <= 41 for c in near["items"])
    box = client.get("/complaints", params={"category_id": ids["cat_b"], "min_lat": LAT - 0.001, "min_lng": LNG - 0.001,
                                            "max_lat": LAT + 0.001, "max_lng": LNG + 0.001}, headers=h).json()
    assert box["total"] == 1
