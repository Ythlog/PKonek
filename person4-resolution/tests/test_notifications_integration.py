"""MySQL integration coverage for notification persistence and ownership."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from resolution import security
from resolution.dev_app import app
from resolution.repositories.notifications import get_recipients, notify
from resolution.services.notifications import STATUS_CHANGED, SLA_WARNING


@pytest.fixture
def seeded(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments (id,name) VALUES (991,'Test Dept')"))
        conn.execute(text("INSERT INTO complaint_categories (id,name,default_sla_hours) VALUES (991,'Test Category',24)"))
        conn.execute(text("INSERT INTO users (id,role_id,email,password_hash,first_name,last_name) VALUES "
                          "(991,1,'p4-citizen@test.invalid','x','Citizen','Test'),"
                          "(992,2,'p4-official@test.invalid','x','Official','Test'),"
                          "(993,3,'p4-admin@test.invalid','x','Admin','Test')"))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (992,991)"))
        conn.execute(text("INSERT INTO complaints (id,citizen_id,category_id,status_id,assigned_department_id,assigned_official_id,title,description,latitude,longitude) "
                          "VALUES (991,991,991,1,991,992,'Test complaint','Description',14.5,121.0)"))
        conn.execute(text("INSERT INTO complaint_support(complaint_id,user_id) VALUES (991,993)"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM notifications WHERE complaint_id=991"))
        conn.execute(text("DELETE FROM complaint_support WHERE complaint_id=991"))
        conn.execute(text("DELETE FROM complaints WHERE id=991"))
        conn.execute(text("DELETE FROM official_profiles WHERE user_id=992"))
        conn.execute(text("DELETE FROM users WHERE id IN (991,992,993)"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=991"))
        conn.execute(text("DELETE FROM departments WHERE id=991"))


def test_recipient_rules_and_notify(mysql_test_engine, seeded):
    with mysql_test_engine.begin() as conn:
        assert set(get_recipients(conn, 991, STATUS_CHANGED)) == {991, 993}
        assert set(get_recipients(conn, 991, SLA_WARNING)) == {992}
        notification_id = notify(conn, 991, 991, STATUS_CHANGED, "Changed", "Status changed")
        assert notification_id > 0


def test_notification_routes_are_user_scoped_and_paginated(mysql_test_engine, seeded, monkeypatch):
    with mysql_test_engine.begin() as conn:
        notify(conn, 991, 991, STATUS_CHANGED, "One", "First")
        notify(conn, 992, 991, STATUS_CHANGED, "Other", "Private")
    monkeypatch.setattr(security, "engine", mysql_test_engine)
    from resolution.routers import notifications as notification_routes
    monkeypatch.setattr(notification_routes, "engine", mysql_test_engine)
    app.dependency_overrides[security.get_current_user] = lambda: security.CurrentUser(991, "citizen")
    try:
        with TestClient(app) as client:
            response = client.get("/api/notifications", params={"page": 1, "page_size": 1, "unread": "true"})
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1 and len(data["items"]) == 1
            assert data["items"][0]["user_id"] == 991
            assert client.get("/api/notifications/unread-count").json() == {"count": 1}
            assert client.patch("/api/notifications/2/read").status_code == 404
            assert client.patch(f"/api/notifications/{data['items'][0]['id']}/read").json() == {"updated": 1}
            assert client.patch("/api/notifications/read-all").json() == {"updated": 0}
    finally:
        app.dependency_overrides.clear()
