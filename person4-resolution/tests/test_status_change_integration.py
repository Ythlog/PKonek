import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from resolution import security
from resolution.dev_app import app
from resolution.routers import status_change as status_routes


@pytest.fixture
def status_seed(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (941,'Status Dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (941,'Status Cat',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES "
                          "(941,1,'status-cit@test.invalid','x','S','Citizen'),(942,2,'status-off@test.invalid','x','S','Official'),(943,1,'status-other@test.invalid','x','S','Other')"))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (942,941)"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,assigned_official_id,title,description,latitude,longitude) VALUES "
                          "(941,941,941,3,941,942,'Done status','Desc',14,121),(942,941,941,1,941,942,'Invalid path','Desc',14,121)"))
        conn.execute(text("INSERT INTO complaint_media(id,complaint_id,uploaded_by,media_type,storage_url,mime_type) VALUES (941,941,942,'after','https://example.test/after.jpg','image/jpeg'),(942,941,942,'before','https://example.test/before.jpg','image/jpeg')"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM notifications WHERE complaint_id IN (941,942)"))
        conn.execute(text("DELETE FROM audit_logs WHERE entity_type='complaint' AND entity_id IN ('941','942')"))
        conn.execute(text("DELETE FROM complaint_status_history WHERE complaint_id IN (941,942)"))
        conn.execute(text("DELETE FROM complaint_media WHERE id IN (941,942)"))
        conn.execute(text("DELETE FROM complaints WHERE id IN (941,942)"))
        conn.execute(text("DELETE FROM official_profiles WHERE user_id=942"))
        conn.execute(text("DELETE FROM users WHERE id IN (941,942,943)"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=941"))
        conn.execute(text("DELETE FROM departments WHERE id=941"))


def test_official_done_checks_after_media_and_writes_atomically(status_seed,mysql_test_engine,monkeypatch):
    monkeypatch.setattr(status_routes,"engine",mysql_test_engine)
    app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(942,"official",941)
    try:
        with TestClient(app) as client:
            missing=client.post('/api/complaints/941/status',json={'to_status':'resolved_pending_verification','note':'Done'})
            wrong=client.post('/api/complaints/941/status',json={'to_status':'resolved_pending_verification','note':'Done','after_media_id':942})
            done=client.post('/api/complaints/941/status',json={'to_status':'resolved_pending_verification','note':'Done','after_media_id':941})
        assert missing.status_code==409 and missing.json()['detail']['code']=='AFTER_PHOTO_REQUIRED'
        assert wrong.status_code==409
        assert done.status_code==200
        with mysql_test_engine.connect() as conn:
            assert conn.execute(text("SELECT status_id=(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),resolved_at IS NOT NULL FROM complaints WHERE id=941")).one()==(1,1)
            assert conn.execute(text("SELECT COUNT(*) FROM complaint_status_history WHERE complaint_id=941")).scalar_one()==1
            assert conn.execute(text("SELECT COUNT(*) FROM audit_logs WHERE entity_type='complaint' AND entity_id='941'")).scalar_one()==1
            assert conn.execute(text("SELECT COUNT(*) FROM notifications WHERE complaint_id=941 AND notification_type='VERIFICATION_REQUESTED' AND user_id=941")).scalar_one()==1
    finally: app.dependency_overrides.clear()


def test_invalid_transition_and_foreign_citizen_denied(status_seed,mysql_test_engine,monkeypatch):
    monkeypatch.setattr(status_routes,"engine",mysql_test_engine)
    app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(942,"official",941)
    try:
        with TestClient(app) as client:
            invalid=client.post('/api/complaints/942/status',json={'to_status':'resolved','note':'skip'})
        assert invalid.status_code==409 and invalid.json()['detail']['code']=='INVALID_TRANSITION'
        app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(943,"citizen")
        with TestClient(app) as client:
            denied=client.post('/api/complaints/941/status',json={'to_status':'under_review'})
        assert denied.status_code==409 and denied.json()['detail']['code']=='FORBIDDEN_COMPLAINT'
    finally: app.dependency_overrides.clear()
