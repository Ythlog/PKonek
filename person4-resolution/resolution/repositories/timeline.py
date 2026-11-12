"""Raw SQL query merging complaint history, responses, and SLA events."""
from sqlalchemy import text
from sqlalchemy.engine import Connection


def complaint_owner(connection: Connection, complaint_id: int) -> int | None:
    return connection.execute(text("SELECT citizen_id FROM complaints WHERE id=:id"), {"id": complaint_id}).scalar_one_or_none()


def timeline_items(connection: Connection, complaint_id: int, *, public_only: bool) -> list[dict]:
    rows = connection.execute(text("""
        SELECT item_type AS type, event_time AS timestamp, display_text, item_id
        FROM (
          SELECT 'status' AS item_type, h.created_at AS event_time,
                 CONCAT('Status changed to ', new_status.label,
                   CASE WHEN h.note IS NOT NULL AND h.note <> '' THEN CONCAT(': ', h.note) ELSE '' END) AS display_text,
                 h.id AS item_id
          FROM complaint_status_history h
          JOIN complaint_statuses new_status ON new_status.id=h.new_status_id
          WHERE h.complaint_id=:complaint_id
            AND (:public_only=FALSE OR h.change_source='citizen')
          UNION ALL
          SELECT 'response', r.created_at,
                 CONCAT('Official response: ', r.body), r.id
          FROM complaint_responses r
          WHERE r.complaint_id=:complaint_id AND (:public_only=FALSE OR r.is_public=TRUE)
          UNION ALL
          SELECT 'sla', e.event_at,
                 CONCAT('SLA event: ', e.event_type,
                   CASE WHEN e.escalation_level > 0 THEN CONCAT(' (level ', e.escalation_level, ')') ELSE '' END),
                 e.id
          FROM sla_events e
          WHERE e.complaint_id=:complaint_id AND :public_only=FALSE
        ) merged
        ORDER BY event_time ASC, item_type ASC, item_id ASC
    """), {"complaint_id": complaint_id, "public_only": public_only}).mappings().all()
    return [dict(row) for row in rows]
