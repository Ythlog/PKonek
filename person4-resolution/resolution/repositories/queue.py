"""Risk-first complaint queue SQL using MySQL CASE for NULL-safe severity ordering."""
from sqlalchemy import text
from sqlalchemy.engine import Connection


_FILTERS = """
  (:status_code IS NULL OR st.code=:status_code)
  AND (:category_id IS NULL OR c.category_id=:category_id)
  AND (:severity IS NULL OR c.ai_severity=:severity)
  AND (:overdue IS NULL OR (c.due_at IS NOT NULL AND c.due_at < UTC_TIMESTAMP(3))=:overdue)
  AND (:assigned_to_me=FALSE OR c.assigned_official_id=:user_id)
  AND (:is_admin=TRUE OR c.assigned_department_id=:department_id)
"""

_SELECT = """
  SELECT c.id,c.public_id,c.title,c.description,c.category_id,cat.name AS category_name,
         st.code AS status_code,c.ai_severity,c.assigned_department_id,c.assigned_official_id,
         c.submitted_at,c.due_at,
         (SELECT COUNT(*) FROM complaint_support cs WHERE cs.complaint_id=c.id) AS support_count,
         (c.due_at IS NOT NULL AND c.due_at < UTC_TIMESTAMP(3) AND st.is_terminal=FALSE) AS is_overdue,
         CASE WHEN c.due_at IS NULL THEN NULL
              ELSE TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(3), c.due_at) END AS time_left_seconds
  FROM complaints c
  JOIN complaint_categories cat ON cat.id=c.category_id
  JOIN complaint_statuses st ON st.id=c.status_id
  WHERE """ + _FILTERS


def queue_page(connection: Connection, *, user_id: int, department_id: int | None, is_admin: bool,
               page: int, page_size: int, status_code: str | None = None,
               category_id: int | None = None, severity: str | None = None,
               overdue: bool | None = None, assigned_to_me: bool = False) -> tuple[list[dict], int]:
    params = {"user_id":user_id,"department_id":department_id,"is_admin":is_admin,
              "status_code":status_code,"category_id":category_id,"severity":severity,
              "overdue":overdue,"assigned_to_me":assigned_to_me,
              "limit":page_size,"offset":(page-1)*page_size}
    total = int(connection.execute(text("SELECT COUNT(*) FROM complaints c JOIN complaint_statuses st ON st.id=c.status_id WHERE " + _FILTERS), params).scalar_one())
    rows = connection.execute(text(_SELECT + """
      ORDER BY (c.due_at IS NOT NULL AND c.due_at < UTC_TIMESTAMP(3) AND st.is_terminal=FALSE) DESC,
        CASE c.ai_severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END ASC,
        c.due_at ASC, c.submitted_at ASC, c.id ASC
      LIMIT :limit OFFSET :offset
    """), params).mappings().all()
    return [dict(row) for row in rows], total
