import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from resolution.dev_app import app
from resolution.routers import public_accountability as board_routes


@pytest.fixture
def public_board_seed(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (871,'Public Board Dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (871,'Public Board Cat',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES (871,1,'private-person@example.test','secret','PrivateFirst','PrivateLast')"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,title,description,latitude,longitude,submitted_at,due_at) VALUES "
                          "(871,871,871,(SELECT id FROM complaint_statuses WHERE code='resolved'),871,'Sensitive complaint title','Sensitive complaint body',14,121,UTC_TIMESTAMP(3)-INTERVAL 4 HOUR,UTC_TIMESTAMP(3)+INTERVAL 20 HOUR)"))
        conn.execute(text("INSERT INTO complaint_status_history(complaint_id,new_status_id,changed_by,change_source,created_at) VALUES "
                          "(871,(SELECT id FROM complaint_statuses WHERE code='under_review'),871,'official',UTC_TIMESTAMP(3)-INTERVAL 3 HOUR),"
                          "(871,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),871,'official',UTC_TIMESTAMP(3)-INTERVAL 1 HOUR)"))
        conn.execute(text("INSERT INTO complaint_verifications(complaint_id,citizen_id,verdict) VALUES (871,871,'confirmed')"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM complaint_verifications WHERE complaint_id=871"))
        conn.execute(text("DELETE FROM complaint_status_history WHERE complaint_id=871"))
        conn.execute(text("DELETE FROM complaints WHERE id=871"))
        conn.execute(text("DELETE FROM users WHERE id=871"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=871"))
        conn.execute(text("DELETE FROM departments WHERE id=871"))


def test_public_board_aggregates_only_and_sets_short_cache(public_board_seed,mysql_test_engine,monkeypatch):
    monkeypatch.setattr(board_routes,"engine",mysql_test_engine)
    with TestClient(app) as client:
        response=client.get('/api/public/accountability/departments')
    assert response.status_code==200
    assert response.headers['cache-control']=='max-age=60'
    body=response.json()
    assert body==[{
      'department':'Public Board Dept','total_complaints':1,
      'average_response_hours':1.0,'sla_compliance_percent':100.0,
      'verified_resolution_rate':100.0,
    }]
    serialized=response.text.lower()
    for pii in ('privatefirst','privatelast','private-person@example.test','sensitive complaint','citizen_id','complaint_id','email','first_name'):
        assert pii not in serialized
    assert '871' not in serialized
