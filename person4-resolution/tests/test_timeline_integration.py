import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from resolution import security
from resolution.dev_app import app
from resolution.routers import timeline as timeline_routes


@pytest.fixture
def timeline_seed(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (971,'Timeline Dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (971,'Timeline Cat',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES "
                          "(971,1,'timeline-owner@test.invalid','x','T','Owner'),(972,1,'timeline-other@test.invalid','x','T','Other'),"
                          "(973,2,'timeline-official@test.invalid','x','T','Official'),(974,3,'timeline-admin@test.invalid','x','T','Admin')"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,title,description,latitude,longitude) VALUES "
                          "(971,971,971,1,'Timeline public','Description',14.5,121.0),(972,971,971,1,'Timeline private','Description',14.5,121.0)"))
        conn.execute(text("INSERT INTO complaint_status_history(complaint_id,new_status_id,changed_by,change_source,note) VALUES "
                          "(971,1,971,'citizen','public history'),(971,2,973,'official','internal history')"))
        conn.execute(text("INSERT INTO complaint_responses(complaint_id,author_id,body,is_public) VALUES "
                          "(971,973,'public response',TRUE),(971,973,'private response',FALSE)"))
        conn.execute(text("INSERT INTO sla_events(complaint_id,event_type,details) VALUES (971,'warning',JSON_OBJECT())"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM sla_events WHERE complaint_id=971"))
        conn.execute(text("DELETE FROM complaint_responses WHERE complaint_id=971"))
        conn.execute(text("DELETE FROM complaint_status_history WHERE complaint_id=971"))
        conn.execute(text("DELETE FROM complaints WHERE id IN (971,972)"))
        conn.execute(text("DELETE FROM users WHERE id IN (971,972,973,974)"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=971"))
        conn.execute(text("DELETE FROM departments WHERE id=971"))


def test_citizen_sees_only_own_public_timeline(timeline_seed, mysql_test_engine, monkeypatch):
    monkeypatch.setattr(timeline_routes, "engine", mysql_test_engine)
    app.dependency_overrides[security.get_current_user] = lambda: security.CurrentUser(971, "citizen")
    try:
        with TestClient(app) as client:
            visible = client.get("/api/complaints/971/timeline")
            denied = client.get("/api/complaints/972/timeline")
        assert visible.status_code == 200
        assert {item["type"] for item in visible.json()} == {"status", "response"}
        assert all("private" not in item["display_text"] and "internal" not in item["display_text"] for item in visible.json())
        assert denied.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("role", ["official", "pasig_admin"])
def test_official_and_admin_see_all_chronological_items(timeline_seed, mysql_test_engine, monkeypatch, role):
    monkeypatch.setattr(timeline_routes, "engine", mysql_test_engine)
    app.dependency_overrides[security.get_current_user] = lambda: security.CurrentUser(973, role, 971)
    try:
        with TestClient(app) as client:
            response = client.get("/api/complaints/971/timeline")
        assert response.status_code == 200
        items = response.json()
        assert {item["type"] for item in items} == {"status", "response", "sla"}
        timestamps = [item["timestamp"] for item in items]
        assert timestamps == sorted(timestamps)
        assert any("private" in item["display_text"] for item in items)
    finally:
        app.dependency_overrides.clear()
