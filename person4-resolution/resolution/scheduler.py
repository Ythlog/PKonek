"""Explicit APScheduler lifecycle and idempotent SLA due-date backfill."""
from datetime import datetime, timezone
from typing import Callable

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import text

from .config import get_settings
from .db import engine
from .domain.sla import due_at
from .repositories.notifications import get_recipients, notify
from .services.notifications import SLA_WARNING

_scheduler: BackgroundScheduler | None = None


def backfill_due_dates(*, connection_engine=engine, clock: Callable[[], datetime] | None = None,
                       batch_size: int = 100) -> int:
    """Backfill due_at and create its due event; SKIP LOCKED allows multiple workers."""
    del clock  # The due date is based on submitted_at; clock is injectable for job observability/tests.
    updated = 0
    with connection_engine.begin() as connection:
        rows = connection.execute(text("""
          SELECT c.id,c.submitted_at,cat.default_sla_hours
          FROM complaints c JOIN complaint_categories cat ON cat.id=c.category_id
          JOIN complaint_statuses st ON st.id=c.status_id
          WHERE c.due_at IS NULL AND st.is_terminal=FALSE
          ORDER BY c.id LIMIT :batch_size FOR UPDATE SKIP LOCKED
        """), {"batch_size":batch_size}).mappings().all()
        for row in rows:
            deadline = due_at(row["submitted_at"], float(row["default_sla_hours"]))
            result = connection.execute(text("""
              UPDATE complaints SET due_at=:due_at WHERE id=:id AND due_at IS NULL
            """), {"due_at":deadline,"id":row["id"]})
            if result.rowcount:
                connection.execute(text("""
                  INSERT INTO sla_events(complaint_id,event_type,details)
                  VALUES(:id,'due',JSON_OBJECT('due_at',DATE_FORMAT(:due_at,'%Y-%m-%d %H:%i:%s.%f'),'cycle',1))
                """), {"id":row["id"],"due_at":deadline})
                updated += 1
    return updated


def emit_sla_warnings(*, connection_engine=engine, clock: Callable[[], datetime] | None = None,
                      batch_size: int = 100) -> int:
    """Create one warning event and notification per complaint SLA cycle at 75%."""
    now = (clock or (lambda: datetime.now(timezone.utc)))()
    created = 0
    with connection_engine.begin() as connection:
        rows = connection.execute(text("""
          SELECT c.id,c.due_at,c.submitted_at,c.assigned_department_id,c.assigned_official_id
          FROM complaints c JOIN complaint_statuses st ON st.id=c.status_id
          WHERE c.due_at IS NOT NULL AND st.is_terminal=FALSE
            AND st.code <> 'resolved_pending_verification'
            AND c.due_at <= TIMESTAMPADD(SECOND,
                -CAST(TIMESTAMPDIFF(SECOND,c.submitted_at,c.due_at) * (1-:warning_ratio) AS SIGNED), :now)
          ORDER BY c.id LIMIT :batch_size FOR UPDATE SKIP LOCKED
        """), {"warning_ratio":get_settings().sla_warning_ratio,"now":now,"batch_size":batch_size}).mappings().all()
        for row in rows:
            cycle_start = row["submitted_at"]
            exists = connection.execute(text("""
              SELECT 1 FROM sla_events WHERE complaint_id=:id AND event_type='warning'
                AND JSON_UNQUOTE(JSON_EXTRACT(details,'$.cycle_start'))=:cycle_start LIMIT 1
            """), {"id":row["id"],"cycle_start":cycle_start.strftime("%Y-%m-%d %H:%M:%S.%f")}).first()
            if exists:
                continue
            connection.execute(text("""
              INSERT INTO sla_events(complaint_id,event_type,event_at,details)
              VALUES(:id,'warning',:now,JSON_OBJECT('cycle_start',DATE_FORMAT(:cycle_start,'%Y-%m-%d %H:%i:%s.%f'),
                    'due_at',DATE_FORMAT(:due_at,'%Y-%m-%d %H:%i:%s.%f')))
            """), {"id":row["id"],"now":now,"cycle_start":cycle_start,"due_at":row["due_at"]})
            # Recipient resolution uses the locked complaint's assignment fields.
            recipients = set()
            if row["assigned_official_id"] is not None:
                recipients.add(int(row["assigned_official_id"]))
            if row["assigned_department_id"] is not None:
                recipients.update(int(value) for value in connection.execute(text("""
                  SELECT op.user_id FROM official_profiles op JOIN users u ON u.id=op.user_id
                  WHERE op.department_id=:department_id AND u.account_status='active'
                """), {"department_id":row["assigned_department_id"]}).scalars())
            for recipient in recipients:
                notify(connection,recipient,int(row["id"]),SLA_WARNING,"SLA warning","Complaint has reached its SLA warning threshold.")
            created += 1
    return created


def start_scheduler() -> None:
    """Start the interval job once; importing this module never starts it."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return
    scheduler = BackgroundScheduler(timezone=timezone.utc)
    scheduler.add_job(backfill_due_dates, "interval", minutes=get_settings().sla_job_interval_minutes,
                      id="person4_due_backfill", replace_existing=True, max_instances=1, coalesce=True)
    scheduler.add_job(emit_sla_warnings, "interval", minutes=get_settings().sla_job_interval_minutes,
                      id="person4_sla_warning", replace_existing=True, max_instances=1, coalesce=True)
    scheduler.start()
    _scheduler = scheduler


def stop_scheduler() -> None:
    """Stop the scheduler if it was explicitly started."""
    global _scheduler
    if _scheduler is not None:
        if _scheduler.running:
            _scheduler.shutdown(wait=False)
        _scheduler = None
