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


def process_overdue_and_escalate(*, connection_engine=engine, clock: Callable[[], datetime] | None = None,
                                 batch_size: int = 100) -> int:
    """At SLA expiry, create overdue/escalation records and apply level-1 routing once per cycle."""
    now = (clock or (lambda: datetime.now(timezone.utc)))()
    processed = 0
    with connection_engine.begin() as connection:
        rows = connection.execute(text("""
          SELECT c.id,c.due_at,c.submitted_at,c.assigned_department_id,c.assigned_official_id
          FROM complaints c JOIN complaint_statuses st ON st.id=c.status_id
          WHERE c.due_at IS NOT NULL AND c.due_at <= :now AND st.is_terminal=FALSE
            AND st.code <> 'resolved_pending_verification'
          ORDER BY c.id LIMIT :batch_size FOR UPDATE SKIP LOCKED
        """), {"now":now,"batch_size":batch_size}).mappings().all()
        for row in rows:
            cycle_key = row["submitted_at"].strftime("%Y-%m-%d %H:%M:%S.%f")
            exists = connection.execute(text("""
              SELECT 1 FROM sla_events WHERE complaint_id=:id AND event_type='overdue'
                AND JSON_UNQUOTE(JSON_EXTRACT(details,'$.cycle_start'))=:cycle_start LIMIT 1
            """), {"id":row["id"],"cycle_start":cycle_key}).first()
            if exists:
                continue
            original_department = row["assigned_department_id"]
            target_department = connection.execute(text("""
              SELECT department_id FROM escalation_targets WHERE level=1
            """)).scalar_one_or_none()
            connection.execute(text("""
              INSERT INTO sla_events(complaint_id,event_type,event_at,details)
              VALUES(:id,'overdue',:now,JSON_OBJECT('cycle_start',DATE_FORMAT(:cycle_start,'%Y-%m-%d %H:%i:%s.%f'),
                'due_at',DATE_FORMAT(:due_at,'%Y-%m-%d %H:%i:%s.%f'),'original_department_id',:original_department))
            """), {"id":row["id"],"now":now,"cycle_start":row["submitted_at"],"due_at":row["due_at"],
                  "original_department":original_department})
            assigned_official = row["assigned_official_id"]
            if target_department is not None:
                connection.execute(text("""
                  UPDATE complaints SET assigned_department_id=:department_id,assigned_official_id=NULL
                  WHERE id=:id
                """), {"department_id":target_department,"id":row["id"]})
                connection.execute(text("""
                  INSERT INTO sla_events(complaint_id,event_type,event_at,escalation_level,details)
                  VALUES(:id,'escalated',:now,1,JSON_OBJECT('cycle_start',DATE_FORMAT(:cycle_start,'%Y-%m-%d %H:%i:%s.%f'),
                    'from_department_id',:original_department,'to_department_id',:target_department))
                """), {"id":row["id"],"now":now,"cycle_start":row["submitted_at"],
                      "original_department":original_department,"target_department":target_department})
            recipients=set()
            if assigned_official is not None:
                recipients.add(int(assigned_official))
            for department_id in (original_department, target_department):
                if department_id is not None:
                    recipients.update(int(uid) for uid in connection.execute(text("""
                      SELECT op.user_id FROM official_profiles op JOIN users u ON u.id=op.user_id
                      WHERE op.department_id=:department_id AND u.account_status='active'
                    """), {"department_id":department_id}).scalars())
            for recipient in recipients:
                notify(connection,recipient,int(row["id"]),SLA_OVERDUE,"Complaint overdue","Complaint has reached its SLA deadline.")
                if target_department is not None:
                    notify(connection,recipient,int(row["id"]),ESCALATED,"Complaint escalated","Complaint was escalated to the level-1 department.")
            processed += 1
    return processed


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
    scheduler.add_job(process_overdue_and_escalate, "interval", minutes=get_settings().sla_job_interval_minutes,
                      id="person4_sla_escalation", replace_existing=True, max_instances=1, coalesce=True)
    scheduler.start()
    _scheduler = scheduler


def stop_scheduler() -> None:
    """Stop the scheduler if it was explicitly started."""
    global _scheduler
    if _scheduler is not None:
        if _scheduler.running:
            _scheduler.shutdown(wait=False)
        _scheduler = None
