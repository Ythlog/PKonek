import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from resolution import security
from resolution.dev_app import app
from resolution.routers import official_dashboard as dashboard_routes


@pytest.fixture
def dashboard_seed(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (881,'Dashboard A'),(882,'Dashboard B')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (881,'Dashboard Cat A',24),(882,'Dashboard Cat B',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES "
          "(881,1,'dash-cit-a@test.invalid','x','D','Citizen A'),(882,1,'dash-cit-b@test.invalid','x','D','Citizen B'),"
          "(883,2,'dash-off-a@test.invalid','x','Official','A'),(884,2,'dash-off-b@test.invalid','x','Official','B')"))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (883,881),(884,882)"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,assigned_official_id,title,description,latitude,longitude,ai_severity) VALUES "
          "(881,881,881,(SELECT id FROM complaint_statuses WHERE code='resolved'),881,883,'A complaint','D',14,121,'high'),"
          "(882,882,882,(SELECT id FROM complaint_statuses WHERE code='in_progress'),882,884,'B complaint','D',14,121,'critical')"))
        conn.execute(text("INSERT INTO complaint_verifications(complaint_id,citizen_id,verdict) VALUES (881,881,'confirmed'),(882,882,'rejected')"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM complaint_verifications WHERE complaint_id IN (881,882)"))
        conn.execute(text("DELETE FROM complaints WHERE id IN (881,882)"))
        conn.execute(text("DELETE FROM official_profiles WHERE user_id IN (883,884)"))
        conn.execute(text("DELETE FROM users WHERE id BETWEEN 881 AND 884"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id IN (881,882)"))
        conn.execute(text("DELETE FROM departments WHERE id IN (881,882)"))


def test_official_dashboard_excludes_other_department(dashboard_seed,mysql_test_engine,monkeypatch):
    monkeypatch.setattr(dashboard_routes,"engine",mysql_test_engine)
    app.dependency_overrides[security.get_current_user]=lambda:security.CurrentUser(883,"official",881)
    try:
        with TestClient(app) as client:
            response=client.get('/api/official/dashboard')
        assert response.status_code==200
        result=response.json()
        assert result['cards']['total']==1
        assert result['cards']['resolved']==1
        assert result['cards']['open']==0
        assert result['by_category']==[{'key':'881','label':'Dashboard Cat A','count':1}]
        assert result['by_severity']==[{'key':'high','label':'high','count':1}]
        assert result['per_official'][0]['key']=='883'
        assert result['per_department'][0]['key']=='881'
        assert response.status_code==200 and 'Dashboard Cat B' not in response.text
    finally: app.dependency_overrides.clear()
