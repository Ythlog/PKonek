import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from resolution import security
from resolution.dev_app import app
from resolution.repositories.notifications import get_recipients
from resolution.routers import assignment as assignment_routes
from resolution.services.assignment import auto_assign


@pytest.fixture
def assignment_seed(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (961,'Assign A'),(962,'Assign B')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (961,'Assign Cat',24),(962,'Unrouted Cat',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES "
                          "(961,1,'assign-cit@test.invalid','x','A','Citizen'),(962,2,'assign-off@test.invalid','x','A','Official'),"
                          "(963,2,'assign-other@test.invalid','x','B','Official'),(964,3,'assign-admin@test.invalid','x','A','Admin')"))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (962,961),(963,962)"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,title,description,latitude,longitude) VALUES "
                          "(961,961,961,1,'Claimable','Desc',14.5,121),(962,961,962,1,'Unrouted','Desc',14.5,121)"))
        conn.execute(text("INSERT INTO category_department_routes(category_id,department_id,priority,is_active) VALUES (961,962,9,TRUE),(961,961,2,TRUE)"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM notifications WHERE complaint_id IN (961,962)"))
        conn.execute(text("DELETE FROM audit_logs WHERE entity_type='complaint' AND entity_id IN ('961','962')"))
        conn.execute(text("DELETE FROM complaint_status_history WHERE complaint_id IN (961,962)"))
        conn.execute(text("DELETE FROM category_department_routes WHERE category_id=961"))
        conn.execute(text("DELETE FROM complaints WHERE id IN (961,962)"))
        conn.execute(text("DELETE FROM official_profiles WHERE user_id IN (962,963)"))
        conn.execute(text("DELETE FROM users WHERE id IN (961,962,963,964)"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id IN (961,962)"))
        conn.execute(text("DELETE FROM departments WHERE id IN (961,962)"))


def test_claim_updates_status_and_history_and_notifies(assignment_seed, mysql_test_engine, monkeypatch):
    monkeypatch.setattr(assignment_routes, "engine", mysql_test_engine)
    app.dependency_overrides[security.get_current_user] = lambda: security.CurrentUser(962,"official",961)
    try:
        with TestClient(app) as client:
            response=client.post('/api/complaints/961/claim')
        assert response.status_code==200 and response.json()['status_code']=='under_review'
        with mysql_test_engine.connect() as conn:
            assert conn.execute(text("SELECT COUNT(*) FROM complaint_status_history WHERE complaint_id=961 AND change_source='official'")).scalar_one()==1
            assert conn.execute(text("SELECT COUNT(*) FROM audit_logs WHERE entity_type='complaint' AND entity_id='961'")).scalar_one()==1
            assert conn.execute(text("SELECT COUNT(*) FROM notifications WHERE complaint_id=961 AND notification_type='ASSIGNED'")).scalar_one()>=1
    finally: app.dependency_overrides.clear()


def test_out_of_department_claim_denied_and_admin_assigns(assignment_seed,mysql_test_engine,monkeypatch):
    monkeypatch.setattr(assignment_routes,"engine",mysql_test_engine)
    app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(963,"official",962)
    try:
        with TestClient(app) as client:
            denied=client.post('/api/complaints/961/claim')
        assert denied.status_code==403
        app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(964,"pasig_admin")
        with TestClient(app) as client:
            assigned=client.put('/api/complaints/961/assignment',json={'department_id':962,'note':'Rebalance'})
        assert assigned.status_code==200 and assigned.json()['assigned_department_id']==962
    finally: app.dependency_overrides.clear()


def test_auto_assign_lowest_priority_and_unroutable_null(assignment_seed,mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        assert auto_assign(conn,961)==961
        assert auto_assign(conn,962) is None
        assert get_recipients(conn,961,'ASSIGNED')
