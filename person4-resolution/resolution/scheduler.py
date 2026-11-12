"""Explicit APScheduler lifecycle and idempotent SLA due-date backfill."""
from datetime import datetime, timezone
from typing import Callable

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import text

from .config import get_settings
from .db import engine
from .domain.sla import due_at

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


def start_scheduler() -> None:
    """Start the interval job once; importing this module never starts it."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return
    scheduler = BackgroundScheduler(timezone=timezone.utc)
    scheduler.add_job(backfill_due_dates, "interval", minutes=get_settings().sla_job_interval_minutes,
                      id="person4_due_backfill", replace_existing=True, max_instances=1, coalesce=True)
    scheduler.start()
    _scheduler = scheduler


def stop_scheduler() -> None:
    """Stop the scheduler if it was explicitly started."""
    global _scheduler
    if _scheduler is not None:
        if _scheduler.running:
            _scheduler.shutdown(wait=False)
        _scheduler = None
