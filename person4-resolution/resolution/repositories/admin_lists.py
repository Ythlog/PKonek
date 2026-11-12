"""Raw SQL for Pasig admin trends, level-2 escalations, and unassigned complaints."""
from datetime import date
from sqlalchemy import text
from sqlalchemy.engine import Connection


def daily_trends(connection: Connection, from_date: date, to_date: date) -> list[dict]:
    rows=connection.execute(text("""
      SELECT calendar.day AS date,
        (SELECT COUNT(*) FROM complaints c WHERE DATE(c.submitted_at)=calendar.day) AS submitted,
        (SELECT COUNT(DISTINCT h.complaint_id) FROM complaint_status_history h
          JOIN complaint_statuses s ON s.id=h.new_status_id
          WHERE s.code='resolved_pending_verification' AND DATE(h.created_at)=calendar.day) AS resolved,
        (SELECT COUNT(*) FROM complaint_status_history h JOIN complaint_statuses s ON s.id=h.new_status_id
          WHERE s.code='reopened' AND DATE(h.created_at)=calendar.day) AS reopened
      FROM (
        SELECT DATE_ADD(:from_date, INTERVAL seq DAY) AS day
        FROM (SELECT a.n + 10*b.n + 100*c.n AS seq FROM
          (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
           UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
          CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
           UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
          CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
           UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c
        ) sequence_days WHERE DATE_ADD(:from_date, INTERVAL seq DAY)<=:to_date
      ) calendar ORDER BY calendar.day
    """),{"from_date":from_date,"to_date":to_date}).mappings().all()
    return [{"date":row["date"].isoformat(),"submitted":int(row["submitted"]),
             "resolved":int(row["resolved"]),"reopened":int(row["reopened"])} for row in rows]


def _paged_complaints(connection: Connection, *, level_two: bool, page: int, page_size: int) -> tuple[list[dict],int]:
    condition = "EXISTS (SELECT 1 FROM sla_events e WHERE e.complaint_id=c.id AND e.event_type='escalated' AND e.escalation_level=2)" if level_two else "c.assigned_department_id IS NULL"
    total=int(connection.execute(text("SELECT COUNT(*) FROM complaints c WHERE "+condition)).scalar_one())
    rows=connection.execute(text(f"""
      SELECT c.id,c.public_id,c.title,c.category_id,cat.name AS category_name,s.code AS status_code,
        c.assigned_department_id,c.assigned_official_id,c.submitted_at,c.due_at,
        (SELECT MAX(e.escalation_level) FROM sla_events e WHERE e.complaint_id=c.id AND e.event_type='escalated') AS escalation_level
      FROM complaints c JOIN complaint_categories cat ON cat.id=c.category_id
      JOIN complaint_statuses s ON s.id=c.status_id WHERE {condition}
      ORDER BY c.due_at ASC,c.submitted_at ASC,c.id ASC LIMIT :limit OFFSET :offset
    """),{"limit":page_size,"offset":(page-1)*page_size}).mappings().all()
    return [dict(row) for row in rows],total


def escalation_list(connection: Connection,page:int,page_size:int):
    return _paged_complaints(connection,level_two=True,page=page,page_size=page_size)


def unassigned_list(connection: Connection,page:int,page_size:int):
    return _paged_complaints(connection,level_two=False,page=page,page_size=page_size)
