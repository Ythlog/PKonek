"""Raw SQL aggregate queries for Pasig admin overview analytics."""
from sqlalchemy import text
from sqlalchemy.engine import Connection


def overview(connection: Connection) -> dict:
    cards=connection.execute(text("""
      SELECT COUNT(*) AS total,
        SUM(st.is_terminal=FALSE) AS open_count,
        SUM(st.is_terminal=FALSE AND c.due_at IS NOT NULL AND c.due_at<UTC_TIMESTAMP(3)) AS overdue,
        SUM(COALESCE(escalation.max_level,0)>0) AS escalated,
        SUM(st.code='resolved') AS resolved,
        (SELECT CASE WHEN COUNT(*)=0 THEN NULL
          ELSE 100.0*SUM(x.was_reopened)/COUNT(*) END
         FROM (
           SELECT c2.id, MAX(sh.new_status_id=(SELECT id FROM complaint_statuses WHERE code='reopened')) AS was_reopened
           FROM complaints c2
           JOIN complaint_statuses ss ON ss.id=c2.status_id
           LEFT JOIN complaint_status_history sh ON sh.complaint_id=c2.id
           WHERE EXISTS (SELECT 1 FROM complaint_status_history done_h JOIN complaint_statuses done_s ON done_s.id=done_h.new_status_id
                         WHERE done_h.complaint_id=c2.id AND done_s.code='resolved_pending_verification')
           GROUP BY c2.id
         ) x) AS reopen_rate
      FROM complaints c JOIN complaint_statuses st ON st.id=c.status_id
      LEFT JOIN (
        SELECT complaint_id,MAX(escalation_level) AS max_level FROM sla_events
        WHERE event_type='escalated' GROUP BY complaint_id
      ) escalation ON escalation.complaint_id=c.id
    """)).mappings().one()
    return {"total":int(cards["total"] or 0),"open":int(cards["open_count"] or 0),
            "overdue":int(cards["overdue"] or 0),"escalated":int(cards["escalated"] or 0),
            "resolved":int(cards["resolved"] or 0),"reopen_rate":float(cards["reopen_rate"]) if cards["reopen_rate"] is not None else None}


def grouped_counts(connection: Connection, group: str) -> list[dict]:
    if group == "status":
        query="""SELECT st.code AS key_name,st.label AS label,COUNT(*) AS count
                 FROM complaints c JOIN complaint_statuses st ON st.id=c.status_id
                 GROUP BY st.id,st.code,st.label ORDER BY st.sort_order"""
    elif group == "category":
        query="""SELECT CAST(cat.id AS CHAR) AS key_name,cat.name AS label,COUNT(c.id) AS count
                 FROM complaint_categories cat LEFT JOIN complaints c ON c.category_id=cat.id
                 GROUP BY cat.id,cat.name ORDER BY cat.name"""
    elif group == "severity":
        query="""SELECT COALESCE(c.ai_severity,'unclassified') AS key_name,
                 COALESCE(c.ai_severity,'Unclassified') AS label,COUNT(*) AS count
                 FROM complaints c GROUP BY c.ai_severity
                 ORDER BY CASE c.ai_severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                   WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END"""
    else:
        raise ValueError("Unsupported analytics grouping")
    rows=connection.execute(text(query)).mappings().all()
    return [{"key":row["key_name"],"label":row["label"],"count":int(row["count"])} for row in rows]
