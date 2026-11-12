"""MySQL integration tests for official responses."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from resolution import security
from resolution.dev_app import app
from resolution.routers import responses as response_routes
from resolution.services.notifications import OFFICIAL_RESPONSE


@pytest.fixture
def response_seed(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (981,'Response Dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (981,'Response Cat',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES "
                          "(981,1,'response-citizen@test.invalid','x','R','Citizen'),"
                          "(982,2,'response-official@test.invalid','x','R','Official'),"
                          "(983,2,'response-outsider@test.invalid','x','R','Outsider'),"
                          "(984,3,'response-admin@test.invalid','x','R','Admin')"))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (982,981),(983,NULL)"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,assigned_official_id,title,description,latitude,longitude) "
                          "VALUES (981,981,981,1,981,982,'Response complaint','Description',14.5,121.0),"
                          "(982,981,981,1,NULL,NULL,'Unassigned complaint','Description',14.5,121.0)"))
        conn.execute(text("INSERT INTO complaint_support(complaint_id,user_id) VALUES (981,984)"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM notifications WHERE complaint_id IN (981,982)"))
        conn.execute(text("DELETE FROM audit_logs WHERE entity_type='complaint_response' AND entity_id IN "
                          "(SELECT CAST(id AS CHAR) FROM complaint_responses WHERE complaint_id IN (981,982))"))
        conn.execute(text("DELETE FROM complaint_responses WHERE complaint_id IN (981,982)"))
        conn.execute(text("DELETE FROM complaint_support WHERE complaint_id=981"))
        conn.execute(text("DELETE FROM complaints WHERE id IN (981,982)"))
        conn.execute(text("DELETE FROM official_profiles WHERE user_id IN (982,983)"))
        conn.execute(text("DELETE FROM users WHERE id IN (981,982,983,984)"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=981"))
        conn.execute(text("DELETE FROM departments WHERE id=981"))


def test_public_response_commits_response_audit_and_recipient_notifications(response_seed, mysql_test_engine, monkeypatch):
    monkeypatch.setattr(response_routes, "engine", mysql_test_engine)
    app.dependency_overrides[security.get_current_user] = lambda: security.CurrentUser(982, "official", 981)
    try:
        with TestClient(app) as client:
            response = client.post("/api/complaints/981/responses", json={"body": "Work completed", "is_public": True})
        assert response.status_code == 201
        with mysql_test_engine.connect() as conn:
            assert conn.execute(text("SELECT COUNT(*) FROM audit_logs WHERE entity_type='complaint_response' AND entity_id=:id"), {"id": str(response.json()["id"])}).scalar_one() == 1
            assert set(conn.execute(text("SELECT user_id FROM notifications WHERE complaint_id=981 AND notification_type=:type"), {"type": OFFICIAL_RESPONSE}).scalars()) == {981,984}
    finally:
        app.dependency_overrides.clear()


def test_private_response_has_no_notifications_and_out_of_scope_is_forbidden(response_seed, mysql_test_engine, monkeypatch):
    monkeypatch.setattr(response_routes, "engine", mysql_test_engine)
    app.dependency_overrides[security.get_current_user] = lambda: security.CurrentUser(982, "official", 981)
    try:
        with TestClient(app) as client:
            private = client.post("/api/complaints/981/responses", json={"body": "Internal", "is_public": False})
            denied = client.post("/api/complaints/982/responses", json={"body": "No access", "is_public": True})
        assert private.status_code == 201
        assert denied.status_code == 403
        with mysql_test_engine.connect() as conn:
            assert conn.execute(text("SELECT COUNT(*) FROM notifications WHERE complaint_id=981 AND notification_type=:type"), {"type": OFFICIAL_RESPONSE}).scalar_one() == 0
    finally:
        app.dependency_overrides.clear()
