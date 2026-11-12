import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from resolution import security
from resolution.dev_app import app
from resolution.routers import verification as verification_routes


@pytest.fixture
def verification_seed(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (931,'Verify Dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (931,'Verify Cat',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES "
                          "(931,1,'verify-cit@test.invalid','x','V','Citizen'),(932,2,'verify-off@test.invalid','x','V','Official'),(933,1,'verify-support@test.invalid','x','V','Support')"))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (932,931)"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,assigned_official_id,title,description,latitude,longitude) VALUES "
                          "(931,931,931,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),931,932,'Verify complaint','Desc',14,121)"))
        conn.execute(text("INSERT INTO complaint_support(complaint_id,user_id) VALUES (931,933)"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM notifications WHERE complaint_id=931"))
        conn.execute(text("DELETE FROM sla_events WHERE complaint_id=931"))
        conn.execute(text("DELETE FROM audit_logs WHERE entity_type='complaint' AND entity_id='931'"))
        conn.execute(text("DELETE FROM complaint_status_history WHERE complaint_id=931"))
        conn.execute(text("DELETE FROM complaint_verifications WHERE complaint_id=931"))
        conn.execute(text("DELETE FROM complaint_support WHERE complaint_id=931"))
        conn.execute(text("DELETE FROM complaints WHERE id=931"))
        conn.execute(text("DELETE FROM official_profiles WHERE user_id=932"))
        conn.execute(text("DELETE FROM users WHERE id IN (931,932,933)"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=931"))
        conn.execute(text("DELETE FROM departments WHERE id=931"))


def test_confirmed_verification_persists_all_effects(verification_seed,mysql_test_engine,monkeypatch):
    monkeypatch.setattr(verification_routes,"engine",mysql_test_engine)
    app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(931,"citizen")
    try:
        with TestClient(app) as client:
            response=client.post('/api/complaints/931/verification',json={'verdict':'confirmed','note':'Looks fixed'})
        assert response.status_code==201 and response.json()['status_code']=='resolved'
        with mysql_test_engine.connect() as conn:
            assert conn.execute(text("SELECT verified_at IS NOT NULL FROM complaints WHERE id=931")).scalar_one()
            assert conn.execute(text("SELECT verdict FROM complaint_verifications WHERE complaint_id=931")).scalar_one()=='confirmed'
            assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=931 AND event_type='completed'")).scalar_one()==1
            assert conn.execute(text("SELECT COUNT(*) FROM notifications WHERE complaint_id=931 AND notification_type='COMPLAINT_RESOLVED' AND user_id IN (932,933)")).scalar_one()==2
            assert conn.execute(text("SELECT COUNT(*) FROM audit_logs WHERE entity_type='complaint' AND entity_id='931'")).scalar_one()==1
    finally: app.dependency_overrides.clear()


def test_only_original_citizen_and_awaiting_status_can_confirm(verification_seed,mysql_test_engine,monkeypatch):
    monkeypatch.setattr(verification_routes,"engine",mysql_test_engine)
    app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(932,"official",931)
    try:
        with TestClient(app) as client:
            denied=client.post('/api/complaints/931/verification',json={'verdict':'confirmed'})
        assert denied.status_code==403
        app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(931,"citizen")
        with mysql_test_engine.begin() as conn:
            conn.execute(text("UPDATE complaints SET status_id=(SELECT id FROM complaint_statuses WHERE code='resolved') WHERE id=931"))
        with TestClient(app) as client:
            wrong_state=client.post('/api/complaints/931/verification',json={'verdict':'confirmed'})
            rejected=client.post('/api/complaints/931/verification',json={'verdict':'rejected'})
        assert wrong_state.status_code==409
        assert rejected.status_code==400
    finally: app.dependency_overrides.clear()
