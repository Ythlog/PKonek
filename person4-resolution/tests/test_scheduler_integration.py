from datetime import datetime, timezone

import pytest
from sqlalchemy import text

from resolution.scheduler import backfill_due_dates
from resolution.scheduler import emit_sla_warnings


@pytest.fixture
def due_backfill_seed(mysql_test_engine):
    submitted = datetime(2024, 1, 1, tzinfo=timezone.utc)
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (921,'Backfill Cat',6)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES (921,1,'backfill-cit@test.invalid','x','B','Citizen')"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,title,description,latitude,longitude,submitted_at,due_at) VALUES "
                          "(921,921,921,(SELECT id FROM complaint_statuses WHERE code='submitted'),'Backfill','Desc',14,121,:submitted,NULL)"), {"submitted": submitted})
        conn.execute(text("DELETE FROM sla_events WHERE complaint_id=921"))
    yield submitted
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM sla_events WHERE complaint_id=921"))
        conn.execute(text("DELETE FROM complaints WHERE id=921"))
        conn.execute(text("DELETE FROM users WHERE id=921"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=921"))


def test_due_backfill_idempotent_on_second_run(due_backfill_seed, mysql_test_engine):
    submitted = due_backfill_seed
    fixed_clock = lambda: datetime(2030, 1, 1, tzinfo=timezone.utc)
    assert backfill_due_dates(connection_engine=mysql_test_engine, clock=fixed_clock) == 1
    assert backfill_due_dates(connection_engine=mysql_test_engine, clock=fixed_clock) == 0
    with mysql_test_engine.connect() as conn:
        row = conn.execute(text("SELECT due_at FROM complaints WHERE id=921")).scalar_one()
        events = conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=921 AND event_type='due'" )).scalar_one()
    assert row.replace(tzinfo=timezone.utc) == submitted.replace(tzinfo=timezone.utc) + __import__('datetime').timedelta(hours=6)
    assert events == 1


@pytest.fixture
def warning_seed(mysql_test_engine):
    now=datetime(2030,1,1,tzinfo=timezone.utc)
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (922,'Warning Dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (922,'Warning Cat',100)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES (922,1,'warning-cit@test.invalid','x','W','Citizen'),(923,2,'warning-off@test.invalid','x','W','Official')"))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (923,922)"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,assigned_official_id,title,description,latitude,longitude,submitted_at,due_at) VALUES "
          "(922,922,922,(SELECT id FROM complaint_statuses WHERE code='in_progress'),922,923,'Warning open','D',14,121,:submitted,:due),"
          "(923,922,922,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),922,923,'Warning paused','D',14,121,:submitted,:due)"),
          {"submitted":now-timedelta(hours=100),"due":now})
    yield now
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM notifications WHERE complaint_id IN (922,923)"))
        conn.execute(text("DELETE FROM sla_events WHERE complaint_id IN (922,923)"))
        conn.execute(text("DELETE FROM complaints WHERE id IN (922,923)"))
        conn.execute(text("DELETE FROM official_profiles WHERE user_id=923"))
        conn.execute(text("DELETE FROM users WHERE id IN (922,923)"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=922"))
        conn.execute(text("DELETE FROM departments WHERE id=922"))


def test_warning_threshold_once_and_pending_verification_pauses(warning_seed,mysql_test_engine):
    now=warning_seed
    assert emit_sla_warnings(connection_engine=mysql_test_engine,clock=lambda:now-timedelta(hours=25))==0
    assert emit_sla_warnings(connection_engine=mysql_test_engine,clock=lambda:now-timedelta(hours=24,minutes=59))==1
    assert emit_sla_warnings(connection_engine=mysql_test_engine,clock=lambda:now-timedelta(hours=24,minutes=58))==0
    with mysql_test_engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=922 AND event_type='warning'")).scalar_one()==1
        assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=923 AND event_type='warning'")).scalar_one()==0
        assert conn.execute(text("SELECT COUNT(*) FROM notifications WHERE complaint_id=922 AND notification_type='SLA_WARNING' AND user_id=923")).scalar_one()==1
