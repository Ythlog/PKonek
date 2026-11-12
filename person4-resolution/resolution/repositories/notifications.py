"""Raw SQL operations for user notifications."""

from sqlalchemy import text
from sqlalchemy.engine import Connection


def notify(connection: Connection, user_id: int, complaint_id: int | None, type: str, title: str, message: str) -> int:
    result = connection.execute(text("""
        INSERT INTO notifications (user_id, complaint_id, notification_type, title, message)
        VALUES (:user_id, :complaint_id, :notification_type, :title, :message)
    """), {"user_id": user_id, "complaint_id": complaint_id, "notification_type": type,
          "title": title, "message": message})
    return int(result.lastrowid)


def get_recipients(connection: Connection, complaint_id: int, event_type: str, *, escalation_level: int | None = None) -> list[int]:
    """Resolve recipients for citizen, assigned-work, or escalation notifications."""
    if event_type == "ESCALATED" and escalation_level == 2:
        rows = connection.execute(text("""
            SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
            WHERE r.name = 'pasig_admin' AND u.account_status = 'active'
        """)).all()
    elif event_type in {"SLA_WARNING", "SLA_OVERDUE", "ESCALATED", "COMPLAINT_REOPENED"}:
        rows = connection.execute(text("""
            SELECT DISTINCT recipient_id FROM (
              SELECT c.assigned_official_id AS recipient_id
              FROM complaints c WHERE c.id = :complaint_id AND c.assigned_official_id IS NOT NULL
              UNION
              SELECT op.user_id AS recipient_id FROM complaints c
              JOIN official_profiles op ON op.department_id = c.assigned_department_id
              JOIN users u ON u.id = op.user_id AND u.account_status = 'active'
              WHERE c.id = :complaint_id
            ) recipients WHERE recipient_id IS NOT NULL
        """), {"complaint_id": complaint_id}).all()
    else:
        rows = connection.execute(text("""
            SELECT c.citizen_id AS user_id FROM complaints c WHERE c.id = :complaint_id
            UNION
            SELECT cs.user_id FROM complaint_support cs WHERE cs.complaint_id = :complaint_id
        """), {"complaint_id": complaint_id}).all()
    return [int(row[0]) for row in rows]


def list_notifications(connection: Connection, user_id: int, page: int, page_size: int, unread: bool | None) -> tuple[list[dict], int]:
    where = "user_id = :user_id" + (" AND read_at IS NULL" if unread else " AND read_at IS NOT NULL" if unread is False else "")
    params = {"user_id": user_id, "limit": page_size, "offset": (page - 1) * page_size}
    total = int(connection.execute(text(f"SELECT COUNT(*) FROM notifications WHERE {where}"), params).scalar_one())
    rows = connection.execute(text(f"""
        SELECT id, user_id, complaint_id, notification_type, title, message, read_at, created_at
        FROM notifications WHERE {where} ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset
    """), params).mappings().all()
    return [dict(row) for row in rows], total


def unread_count(connection: Connection, user_id: int) -> int:
    return int(connection.execute(text("SELECT COUNT(*) FROM notifications WHERE user_id=:uid AND read_at IS NULL"), {"uid": user_id}).scalar_one())


def mark_read(connection: Connection, user_id: int, notification_id: int) -> bool:
    result = connection.execute(text("UPDATE notifications SET read_at=UTC_TIMESTAMP(3) WHERE id=:id AND user_id=:uid AND read_at IS NULL"), {"id": notification_id, "uid": user_id})
    return result.rowcount > 0


def mark_all_read(connection: Connection, user_id: int) -> int:
    result = connection.execute(text("UPDATE notifications SET read_at=UTC_TIMESTAMP(3) WHERE user_id=:uid AND read_at IS NULL"), {"uid": user_id})
    return int(result.rowcount)
