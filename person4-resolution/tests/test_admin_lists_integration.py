from datetime import date, datetime
import pytest
from sqlalchemy import text

from resolution.repositories.admin_lists import daily_trends, escalation_list, unassigned_list


@pytest.fixture
def admin_lists_seed(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (891,'List Dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (891,'List Cat',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES (891,1,'lists-cit@test.invalid','x','L','Citizen')"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,title,description,latitude,longitude,submitted_at) VALUES "
          "(891,891,891,(SELECT id FROM complaint_statuses WHERE code='submitted'),'Trend submitted','D',14,121,'2025-02-10 08:00:00.000'),"
          "(892,891,891,(SELECT id FROM complaint_statuses WHERE code='resolved'),'Trend resolved','D',14,121,'2025-02-10 09:00:00.000'),"
          "(893,891,891,(SELECT id FROM complaint_statuses WHERE code='reopened'),'Unassigned reopened','D',14,121,'2025-02-11 09:00:00.000'),"
          "(894,891,891,(SELECT id FROM complaint_statuses WHERE code='in_progress'),'Escalated assigned','D',14,121,'2025-02-11 10:00:00.000')"))
        conn.execute(text("INSERT INTO complaint_status_history(complaint_id,new_status_id,changed_by,change_source,created_at) VALUES "
          "(892,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),891,'official','2025-02-10 11:00:00.000'),"
          "(893,(SELECT id FROM complaint_statuses WHERE code='reopened'),891,'citizen','2025-02-11 12:00:00.000')"))
        conn.execute(text("INSERT INTO sla_events(complaint_id,event_type,escalation_level) VALUES (894,'escalated',2)"))
        conn.execute(text("UPDATE complaints SET assigned_department_id=891 WHERE id=894"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM sla_events WHERE complaint_id BETWEEN 891 AND 894"))
        conn.execute(text("DELETE FROM complaint_status_history WHERE complaint_id BETWEEN 891 AND 894"))
        conn.execute(text("DELETE FROM complaints WHERE id BETWEEN 891 AND 894"))
        conn.execute(text("DELETE FROM users WHERE id=891"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=891"))
        conn.execute(text("DELETE FROM departments WHERE id=891"))


def test_daily_trend_recharts_shape_and_date_range(admin_lists_seed,mysql_test_engine):
    with mysql_test_engine.connect() as conn:
        rows=daily_trends(conn,date(2025,2,10),date(2025,2,12))
    assert rows==[
      {"date":"2025-02-10","submitted":2,"resolved":1,"reopened":0},
      {"date":"2025-02-11","submitted":2,"resolved":0,"reopened":1},
      {"date":"2025-02-12","submitted":0,"resolved":0,"reopened":0},
    ]


def test_level_two_and_unassigned_lists_paginate(admin_lists_seed,mysql_test_engine):
    with mysql_test_engine.connect() as conn:
        red,total_red=escalation_list(conn,1,1)
        unassigned,total_unassigned=unassigned_list(conn,1,10)
    assert total_red==1 and red[0]['id']==894 and red[0]['escalation_level']==2
    assert total_unassigned==3 and {row['id'] for row in unassigned}=={891,892,893}
