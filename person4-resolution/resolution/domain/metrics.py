"""Pure metric definitions for complaint workflow reporting.

Definitions:

* ``first_response_time``: time of the first status change by an official/admin
  minus ``submitted_at``.
* ``resolution_time``: time of the first move to
  ``resolved_pending_verification`` minus ``submitted_at``.
* ``sla_compliance_percent``: percentage of complaints whose first Done mark
  (the first move to ``resolved_pending_verification``) is at or before their
  original due time.
* ``verified_resolution_rate``: confirmed / (confirmed + rejected), excluding
  ``auto_timeout`` verdicts.
* ``reopen_rate``: complaints reopened at least once / complaints with a first
  Done mark.

These helpers accept event data and do not access a database or framework.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable


@dataclass(frozen=True, slots=True)
class StatusChange:
    status: str
    changed_at: datetime
    actor: str


def first_response_time(submitted_at: datetime, changes: Iterable[StatusChange]) -> timedelta | None:
    events = (event for event in changes if event.actor in {"official", "admin", "pasig_admin"})
    first = min(events, key=lambda event: event.changed_at, default=None)
    return first.changed_at - submitted_at if first else None


def resolution_time(submitted_at: datetime, changes: Iterable[StatusChange]) -> timedelta | None:
    done = (event for event in changes if event.status == "resolved_pending_verification")
    first = min(done, key=lambda event: event.changed_at, default=None)
    return first.changed_at - submitted_at if first else None


def sla_compliance_percent(first_done_and_due: Iterable[tuple[datetime | None, datetime]]) -> float | None:
    """Percent of complaints with a first Done timestamp on/before original due; None if empty."""
    rows = list(first_done_and_due)
    if not rows:
        return None
    compliant = sum(first_done is not None and first_done <= due for first_done, due in rows)
    return compliant * 100.0 / len(rows)


def verified_resolution_rate(verdicts: Iterable[str]) -> float | None:
    """Confirmed / (confirmed + rejected) as percent; ignores auto_timeout; None if no votes."""
    counted = [verdict for verdict in verdicts if verdict in {"confirmed", "rejected"}]
    if not counted:
        return None
    return counted.count("confirmed") * 100.0 / len(counted)


def reopen_rate(reopened_flags: Iterable[bool]) -> float | None:
    """Percent of complaints with a first Done mark that were reopened at least once."""
    flags = list(reopened_flags)
    if not flags:
        return None
    return sum(bool(flag) for flag in flags) * 100.0 / len(flags)

