"""Notification constants and transaction-scoped service helpers."""

from sqlalchemy.engine import Connection

from ..repositories.notifications import get_recipients, notify

STATUS_CHANGED = "STATUS_CHANGED"
OFFICIAL_RESPONSE = "OFFICIAL_RESPONSE"
VERIFICATION_REQUESTED = "VERIFICATION_REQUESTED"
COMPLAINT_REOPENED = "COMPLAINT_REOPENED"
COMPLAINT_RESOLVED = "COMPLAINT_RESOLVED"
SLA_WARNING = "SLA_WARNING"
SLA_OVERDUE = "SLA_OVERDUE"
ESCALATED = "ESCALATED"
ASSIGNED = "ASSIGNED"
NOTIFICATION_TYPES = frozenset({STATUS_CHANGED, OFFICIAL_RESPONSE, VERIFICATION_REQUESTED,
                                COMPLAINT_REOPENED, COMPLAINT_RESOLVED, SLA_WARNING,
                                SLA_OVERDUE, ESCALATED, ASSIGNED})


def notify_recipients(connection: Connection, complaint_id: int, type: str, title: str, message: str,
                      *, escalation_level: int | None = None) -> int:
    recipients = get_recipients(connection, complaint_id, type, escalation_level=escalation_level)
    return sum(notify(connection, user_id, complaint_id, type, title, message) is not None for user_id in recipients)
