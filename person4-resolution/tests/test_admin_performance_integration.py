from datetime import datetime, timedelta
import pytest
from sqlalchemy import text

from resolution.repositories.admin_performance import response_time_stats, verification_rates


@pytest.fixture
def performance_seed(mysql_test_engine):
    start=datetime(2024,1,1,12,0,0)
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (901,'Performance Dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (901,'Performance Cat',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES "
                          "(901,1,'perf-cit@test.invalid','x','P','Citizen'),(902,2,'perf-off@test.invalid','x','P','Official')"))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (902,901)"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,assigned_official_id,title,description,latitude,longitude,submitted_at,due_at) VALUES "
          "(901,901,901,(SELECT id FROM complaint_statuses WHERE code='resolved'),901,902,'Perf one','D',14,121,:s1,:due),"
          "(902,901,901,(SELECT id FROM complaint_statuses WHERE code='reopened'),901,902,'Perf two','D',14,121,:s2,:due)"),
          {"s1":start,"s2":start+timedelta(hours=2),"due":start+timedelta(hours=24)})
        # First complaint: confirmed plus auto_timeout (timeout excluded); second: rejected.
        conn.execute(text("INSERT INTO complaint_verifications(complaint_id,citizen_id,verdict) VALUES "
          "(901,901,'confirmed'),(901,901,'auto_timeout'),(902,901,'rejected')"))
        conn.execute(text("INSERT INTO complaint_status_history(complaint_id,old_status_id,new_status_id,changed_by,change_source,created_at) VALUES "
          "(901,NULL,(SELECT id FROM complaint_statuses WHERE code='under_review'),902,'official',:s1+INTERVAL 2 HOUR),"
          "(901,NULL,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),902,'official',:s1+INTERVAL 10 HOUR),"
          "(902,NULL,(SELECT id FROM complaint_statuses WHERE code='under_review'),902,'official',:s2+INTERVAL 4 HOUR),"
          "(902,NULL,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),902,'official',:s2+INTERVAL 30 HOUR)"),
          {"s1":start,"s2":start+timedelta(hours=2)})
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM complaint_status_history WHERE complaint_id IN (901,902)"))
        conn.execute(text("DELETE FROM complaint_verifications WHERE complaint_id IN (901,902)"))
        conn.execute(text("DELETE FROM complaints WHERE id IN (901,902)"))
        conn.execute(text("DELETE FROM official_profiles WHERE user_id=902"))
        conn.execute(text("DELETE FROM users WHERE id IN (901,902)"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=901"))
        conn.execute(text("DELETE FROM departments WHERE id=901"))


def test_verified_rate_rejection_lowers_and_timeout_is_excluded(performance_seed,mysql_test_engine):
    with mysql_test_engine.connect() as conn:
        official=verification_rates(conn,'official')
        department=verification_rates(conn,'department')
    assert official==[{"key":"902","label":"P","confirmed":1,"rejected":1,"rate":50.0}]
    assert department==[{"key":"901","label":"Performance Dept","confirmed":1,"rejected":1,"rate":50.0}]


def test_response_time_and_sla_stats_follow_metric_definitions(performance_seed,mysql_test_engine):
    with mysql_test_engine.connect() as conn:
        stats=response_time_stats(conn)
    assert stats["average_first_response_seconds"]==3*3600
    # first Done marks are 10h and 30h after submission; one is within the original due.
    assert stats["average_resolution_seconds"]==20*3600
    assert stats["sla_compliance_percent"]==50.0
