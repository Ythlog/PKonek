"""Privacy-preserving, department-level public accountability aggregates."""
from sqlalchemy import text
from sqlalchemy.engine import Connection


def department_board(connection: Connection) -> list[dict]:
    rows=connection.execute(text("""
      SELECT d.id AS department_id,d.name AS department,
        COUNT(DISTINCT c.id) AS total_complaints,
        AVG(first_response.seconds)/3600.0 AS average_response_hours,
        100.0*SUM(done.first_done_at IS NOT NULL AND done.first_done_at<=c.due_at)
          /NULLIF(SUM(done.first_done_at IS NOT NULL),0) AS sla_compliance_percent,
        100.0*SUM(vote.confirmed_count)
          /NULLIF(SUM(vote.confirmed_count+vote.rejected_count),0) AS verified_resolution_rate
      FROM departments d
      LEFT JOIN complaints c ON c.assigned_department_id=d.id
      LEFT JOIN (
        SELECT h.complaint_id,TIMESTAMPDIFF(SECOND,c0.submitted_at,MIN(h.created_at)) AS seconds
        FROM complaint_status_history h JOIN complaints c0 ON c0.id=h.complaint_id
        WHERE h.change_source IN ('official','admin','system') GROUP BY h.complaint_id,c0.submitted_at
      ) first_response ON first_response.complaint_id=c.id
      LEFT JOIN (
        SELECT h.complaint_id,MIN(h.created_at) AS first_done_at
        FROM complaint_status_history h JOIN complaint_statuses s ON s.id=h.new_status_id
        WHERE s.code='resolved_pending_verification' GROUP BY h.complaint_id
      ) done ON done.complaint_id=c.id
      LEFT JOIN (
        SELECT complaint_id,SUM(verdict='confirmed') AS confirmed_count,SUM(verdict='rejected') AS rejected_count
        FROM complaint_verifications WHERE verdict IN ('confirmed','rejected') GROUP BY complaint_id
      ) vote ON vote.complaint_id=c.id
      GROUP BY d.id,d.name ORDER BY d.name
    """)).mappings().all()
    return [{"department":r["department"],"total_complaints":int(r["total_complaints"] or 0),
      "average_response_hours":float(r["average_response_hours"]) if r["average_response_hours"] is not None else None,
      "sla_compliance_percent":float(r["sla_compliance_percent"]) if r["sla_compliance_percent"] is not None else None,
      "verified_resolution_rate":float(r["verified_resolution_rate"]) if r["verified_resolution_rate"] is not None else None} for r in rows]
