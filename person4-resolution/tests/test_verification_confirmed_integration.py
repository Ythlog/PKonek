import pytest
from concurrent.futures import ThreadPoolExecutor
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
                          "(931,1,'verify-cit@test.invalid','x','V','Citizen'),(932,2,'verify-off@test.invalid','x','V','Official'),(933,1,'verify-support@test.invalid','x','V','Support'),"
                          "(934,3,'verify-admin@test.invalid','x','V','Admin')"))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (932,931)"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,assigned_official_id,title,description,latitude,longitude) VALUES "
                          "(931,931,931,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),931,932,'Verify complaint','Desc',14,121),"
                          "(932,931,931,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),931,932,'Repeat complaint','Desc',14,121),"
                          "(933,931,931,(SELECT id FROM complaint_statuses WHERE code='submitted'),931,932,'Full flow','Desc',14,121)"))
        conn.execute(text("INSERT INTO complaint_media(id,complaint_id,uploaded_by,media_type,storage_url,mime_type) VALUES (933,933,931,'before','https://example.test/before933.jpg','image/jpeg')"))
        conn.execute(text("INSERT INTO complaint_support(complaint_id,user_id) VALUES (931,933)"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM notifications WHERE complaint_id IN (931,932,933)"))
        conn.execute(text("DELETE FROM sla_events WHERE complaint_id IN (931,932,933)"))
        conn.execute(text("DELETE FROM audit_logs WHERE entity_type='complaint' AND entity_id IN ('931','932','933')"))
        conn.execute(text("DELETE FROM complaint_status_history WHERE complaint_id IN (931,932,933)"))
        conn.execute(text("DELETE FROM complaint_verifications WHERE complaint_id IN (931,932,933)"))
        conn.execute(text("DELETE FROM complaint_media WHERE complaint_id=933"))
        conn.execute(text("DELETE FROM complaint_support WHERE complaint_id=931"))
        conn.execute(text("DELETE FROM complaints WHERE id IN (931,932,933)"))
        conn.execute(text("DELETE FROM official_profiles WHERE user_id=932"))
        conn.execute(text("DELETE FROM users WHERE id IN (931,932,933,934)"))
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
        assert rejected.status_code==409
    finally: app.dependency_overrides.clear()


def test_rejected_verdict_reopens_with_new_sla_and_escalates_after_repeat(verification_seed,mysql_test_engine,monkeypatch):
    monkeypatch.setattr(verification_routes,"engine",mysql_test_engine)
    app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(931,"citizen")
    try:
        with TestClient(app) as client:
            first=client.post('/api/complaints/932/verification',json={'verdict':'rejected','note':'Still broken'})
        assert first.status_code==201 and first.json()['status_code']=='reopened'
        with mysql_test_engine.begin() as conn:
            conn.execute(text("UPDATE complaints SET status_id=(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification') WHERE id=932"))
        with TestClient(app) as client:
            second=client.post('/api/complaints/932/verification',json={'verdict':'rejected','note':'Still broken again'})
        assert second.status_code==201
        with mysql_test_engine.connect() as conn:
            row=conn.execute(text("SELECT s.code,c.reopened_at,c.due_at FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id WHERE c.id=932")).one()
            assert row[0]=='reopened' and row[1] is not None
            assert row[2] >= row[1] + __import__('datetime').timedelta(hours=4)
            assert conn.execute(text("SELECT COUNT(*) FROM complaint_verifications WHERE complaint_id=932 AND verdict='rejected'")).scalar_one()==2
            assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=932 AND event_type='due'")).scalar_one()==2
            assert conn.execute(text("SELECT COUNT(*) FROM notifications WHERE complaint_id=932 AND notification_type='COMPLAINT_REOPENED' AND user_id=932")).scalar_one()==2
            assert conn.execute(text("SELECT COUNT(*) FROM notifications WHERE complaint_id=932 AND notification_type='COMPLAINT_REOPENED' AND user_id IN (SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='pasig_admin')")).scalar_one()>=1
    finally: app.dependency_overrides.clear()


def test_full_lifecycle_invalid_permissions_and_double_submit(verification_seed,mysql_test_engine,monkeypatch):
    import resolution.services.verification as verification_service
    from resolution.routers import status_change as status_routes
    monkeypatch.setattr(verification_routes,"engine",mysql_test_engine)
    monkeypatch.setattr(status_routes,"engine",mysql_test_engine)
    monkeypatch.setattr(verification_service,"_comparer",verification_service.NullComparer())
    try:
        app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(932,"official",931)
        with TestClient(app) as client:
            invalid=client.post('/api/complaints/933/status',json={'to_status':'resolved','note':'skip'})
            assert invalid.status_code==409
            assert client.post('/api/complaints/933/status',json={'to_status':'under_review'}).status_code==200
            assert client.post('/api/complaints/933/status',json={'to_status':'in_progress'}).status_code==200
            no_photo=client.post('/api/complaints/933/status',json={'to_status':'resolved_pending_verification','note':'Done'})
            assert no_photo.status_code==409
            with mysql_test_engine.begin() as conn:
                conn.execute(text("INSERT INTO complaint_media(id,complaint_id,uploaded_by,media_type,storage_url,mime_type) VALUES (934,933,932,'after','https://example.test/after933.jpg','image/jpeg')"))
            done=client.post('/api/complaints/933/status',json={'to_status':'resolved_pending_verification','note':'Done','after_media_id':934})
            assert done.status_code==200
        app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(931,"citizen")
        with TestClient(app) as client:
            rejected=client.post('/api/complaints/933/verification',json={'verdict':'rejected','note':'Still broken'})
        assert rejected.status_code==201
        app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(931,"citizen")
        with TestClient(app) as client:
            done_again=client.post('/api/complaints/933/status',json={'to_status':'under_review'})
        assert done_again.status_code==409
        app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(932,"official",931)
        with TestClient(app) as client:
            assert client.post('/api/complaints/933/status',json={'to_status':'in_progress'}).status_code==200
            assert client.post('/api/complaints/933/status',json={'to_status':'resolved_pending_verification','note':'Done again','after_media_id':934}).status_code==200
        app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(931,"citizen")
        def confirm_once():
            with TestClient(app) as client:
                return client.post('/api/complaints/933/verification',json={'verdict':'confirmed'}).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            race=list(pool.map(lambda _:confirm_once(),range(2)))
        assert sorted(race)==[201,409]
        with mysql_test_engine.connect() as conn:
            assert conn.execute(text("SELECT COUNT(*) FROM complaint_verifications WHERE complaint_id=933 AND verdict='confirmed'")).scalar_one()==1
    finally:
        with mysql_test_engine.begin() as conn:
            conn.execute(text("DELETE FROM complaint_media WHERE id=934"))
        app.dependency_overrides.clear()
