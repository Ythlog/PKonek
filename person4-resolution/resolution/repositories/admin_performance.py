"""Raw SQL performance aggregates for Pasig admin reporting."""
from sqlalchemy import text
from sqlalchemy.engine import Connection


def verification_rates(connection: Connection, dimension: str, department_id: int | None = None) -> list[dict]:
    if dimension == "official":
        sql="""SELECT CAST(c.assigned_official_id AS CHAR) AS key, u.first_name AS label,
          SUM(v.verdict='confirmed') AS confirmed,SUM(v.verdict='rejected') AS rejected,
          100.0*SUM(v.verdict='confirmed')/NULLIF(SUM(v.verdict IN ('confirmed','rejected')),0) AS rate
          FROM complaints c JOIN complaint_verifications v ON v.complaint_id=c.id
          LEFT JOIN users u ON u.id=c.assigned_official_id
          WHERE c.assigned_official_id IS NOT NULL AND v.verdict IN ('confirmed','rejected')
            AND (:department_id IS NULL OR c.assigned_department_id=:department_id)
          GROUP BY c.assigned_official_id,u.first_name ORDER BY c.assigned_official_id"""
    elif dimension == "department":
        sql="""SELECT CAST(c.assigned_department_id AS CHAR) AS key,d.name AS label,
          SUM(v.verdict='confirmed') AS confirmed,SUM(v.verdict='rejected') AS rejected,
          100.0*SUM(v.verdict='confirmed')/NULLIF(SUM(v.verdict IN ('confirmed','rejected')),0) AS rate
          FROM complaints c JOIN complaint_verifications v ON v.complaint_id=c.id
          LEFT JOIN departments d ON d.id=c.assigned_department_id
          WHERE c.assigned_department_id IS NOT NULL AND v.verdict IN ('confirmed','rejected')
            AND (:department_id IS NULL OR c.assigned_department_id=:department_id)
          GROUP BY c.assigned_department_id,d.name ORDER BY c.assigned_department_id"""
    else:
        raise ValueError("dimension must be official or department")
    return [dict(row) for row in connection.execute(text(sql),{"department_id":department_id}).mappings().all()]


def response_time_stats(connection: Connection, department_id: int | None = None) -> dict:
    row=connection.execute(text("""
      SELECT AVG(first_response_seconds) AS average_first_response_seconds,
             AVG(first_done_seconds) AS average_resolution_seconds,
             100.0*SUM(first_done_at IS NOT NULL AND first_done_at<=original_due_at)
               /NULLIF(SUM(first_done_at IS NOT NULL),0) AS sla_compliance_percent
      FROM (
        SELECT c.id,c.due_at AS original_due_at,
          TIMESTAMPDIFF(SECOND,c.submitted_at,MIN(CASE WHEN h.change_source IN ('official','admin','system')
            THEN h.created_at END)) AS first_response_seconds,
          MIN(CASE WHEN new_status.code='resolved_pending_verification' THEN h.created_at END) AS first_done_at,
          TIMESTAMPDIFF(SECOND,c.submitted_at,MIN(CASE WHEN new_status.code='resolved_pending_verification'
            THEN h.created_at END)) AS first_done_seconds
        FROM complaints c
        LEFT JOIN complaint_status_history h ON h.complaint_id=c.id
        LEFT JOIN complaint_statuses new_status ON new_status.id=h.new_status_id
        WHERE (:department_id IS NULL OR c.assigned_department_id=:department_id)
        GROUP BY c.id,c.submitted_at,c.due_at
      ) complaint_metrics
    """),{"department_id":department_id}).mappings().one()
    return {key:(float(value) if value is not None else None) for key,value in row.items()}
