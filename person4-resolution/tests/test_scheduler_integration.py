import json
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from resolution.scheduler import backfill_due_dates
from resolution.scheduler import emit_sla_warnings
from resolution.scheduler import process_overdue_and_escalate
from resolution.scheduler import escalate_level_two


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
    assert emit_sla_warnings(connection_engine=mysql_test_engine,clock=lambda:now-timedelta(hours=25,minutes=1))==0
    assert emit_sla_warnings(connection_engine=mysql_test_engine,clock=lambda:now-timedelta(hours=24,minutes=59))==1
    assert emit_sla_warnings(connection_engine=mysql_test_engine,clock=lambda:now-timedelta(hours=24,minutes=58))==0
    with mysql_test_engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=922 AND event_type='warning'")).scalar_one()==1
        assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=923 AND event_type='warning'")).scalar_one()==0
        assert conn.execute(text("SELECT COUNT(*) FROM notifications WHERE complaint_id=922 AND notification_type='SLA_WARNING' AND user_id=923")).scalar_one()==1


@pytest.fixture
def overdue_seed(mysql_test_engine):
    now=datetime(2031,1,1,tzinfo=timezone.utc)
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (924,'Overdue Dept'),(925,'Escalation Dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (924,'Overdue Cat',10)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES "
          "(924,1,'overdue-cit@test.invalid','x','O','Citizen'),(925,2,'overdue-off@test.invalid','x','O','Official'),"
          "(929,3,'overdue-admin@test.invalid','x','O','Admin')"))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (925,924)"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,assigned_official_id,title,description,latitude,longitude,submitted_at,due_at) VALUES "
          "(924,924,924,(SELECT id FROM complaint_statuses WHERE code='in_progress'),924,925,'Expired','D',14,121,:submitted,:due),"
          "(926,924,924,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),924,925,'Paused overdue','D',14,121,:submitted,:due)"),
          {"submitted":now-timedelta(hours=10),"due":now-timedelta(seconds=1)})
        conn.execute(text("INSERT INTO escalation_targets(level,department_id,label) VALUES (1,925,'City office')"))
    yield now
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM notifications WHERE complaint_id IN (924,926)"))
        conn.execute(text("DELETE FROM sla_events WHERE complaint_id IN (924,926)"))
        conn.execute(text("DELETE FROM complaints WHERE id IN (924,926)"))
        conn.execute(text("DELETE FROM official_profiles WHERE user_id=925"))
        conn.execute(text("DELETE FROM users WHERE id IN (924,925,929)"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=924"))
        conn.execute(text("DELETE FROM escalation_targets WHERE level=1 AND department_id=925"))
        conn.execute(text("DELETE FROM departments WHERE id IN (924,925)"))


def test_overdue_escalation_once_per_cycle(overdue_seed,mysql_test_engine):
    now=overdue_seed+timedelta(seconds=1)
    assert process_overdue_and_escalate(connection_engine=mysql_test_engine,clock=lambda:now)==1
    assert process_overdue_and_escalate(connection_engine=mysql_test_engine,clock=lambda:now+timedelta(minutes=1))==0
    with mysql_test_engine.connect() as conn:
        row=conn.execute(text("SELECT assigned_department_id,assigned_official_id FROM complaints WHERE id=924")).one()
        assert row==(925,None)
        overdue=conn.execute(text("SELECT details FROM sla_events WHERE complaint_id=924 AND event_type='overdue'")).scalar_one()
        if isinstance(overdue,str):  # MariaDB stores JSON as LONGTEXT and returns a string.
            overdue=json.loads(overdue)
        assert overdue['original_department_id']==924
        assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=924 AND event_type='escalated' AND escalation_level=1")).scalar_one()==1
        assert conn.execute(text("SELECT COUNT(*) FROM notifications WHERE complaint_id=924 AND notification_type IN ('SLA_OVERDUE','ESCALATED')")).scalar_one()>=2
        assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=926 AND event_type='overdue'")).scalar_one()==0


def test_overdue_without_level_one_target_records_only_overdue(mysql_test_engine):
    now=datetime(2032,1,1,tzinfo=timezone.utc)
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (927,'No target dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (927,'No target cat',1)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES (927,1,'no-target@test.invalid','x','N','Citizen')"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,title,description,latitude,longitude,submitted_at,due_at) VALUES "
          "(927,927,927,(SELECT id FROM complaint_statuses WHERE code='in_progress'),927,'No target','D',14,121,:submitted,:due)"),
          {"submitted":now-timedelta(hours=2),"due":now-timedelta(seconds=1)})
    try:
        assert process_overdue_and_escalate(connection_engine=mysql_test_engine,clock=lambda:now)==1
        with mysql_test_engine.connect() as conn:
            assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=927 AND event_type='overdue'")).scalar_one()==1
            assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=927 AND event_type='escalated'")).scalar_one()==0
    finally:
        with mysql_test_engine.begin() as conn:
            conn.execute(text("DELETE FROM notifications WHERE complaint_id=927"))
            conn.execute(text("DELETE FROM sla_events WHERE complaint_id=927"))
            conn.execute(text("DELETE FROM complaints WHERE id=927"))
            conn.execute(text("DELETE FROM users WHERE id=927"))
            conn.execute(text("DELETE FROM complaint_categories WHERE id=927"))
            conn.execute(text("DELETE FROM departments WHERE id=927"))


def test_level_two_at_grace_once_and_current_cycle_level(overdue_seed,mysql_test_engine):
    now=overdue_seed
    # overdue_seed SLA is 10h and due was just before now; L2 is due + 5h.
    assert escalate_level_two(connection_engine=mysql_test_engine,clock=lambda:now+timedelta(hours=4,minutes=59))==0
    # Ensure L1 record in this same cycle so the highest level advances from 1 to 2.
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO sla_events(complaint_id,event_type,event_at,escalation_level,details) VALUES "
                          "(924,'escalated',:now,1,JSON_OBJECT('cycle_start',DATE_FORMAT(:cycle,'%Y-%m-%d %H:%i:%s.%f')))"),
                     {"now":now,"cycle":now-timedelta(hours=10)})
    assert escalate_level_two(connection_engine=mysql_test_engine,clock=lambda:now+timedelta(hours=5))==1
    assert escalate_level_two(connection_engine=mysql_test_engine,clock=lambda:now+timedelta(hours=6))==0
    with mysql_test_engine.connect() as conn:
        assert conn.execute(text("SELECT MAX(escalation_level) FROM sla_events WHERE complaint_id=924 AND event_type='escalated'")).scalar_one()==2
        assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=924 AND event_type='escalated' AND escalation_level=2")).scalar_one()==1
        assert conn.execute(text("SELECT COUNT(*) FROM notifications WHERE complaint_id=924 AND notification_type='ESCALATED' AND user_id IN (SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='pasig_admin')")).scalar_one()>=1
        assert conn.execute(text("SELECT COUNT(*) FROM sla_events WHERE complaint_id=926 AND event_type='escalated' AND escalation_level=2")).scalar_one()==0
