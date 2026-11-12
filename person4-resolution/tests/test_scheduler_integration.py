from datetime import datetime, timezone

import pytest
from sqlalchemy import text

from resolution.scheduler import backfill_due_dates


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
