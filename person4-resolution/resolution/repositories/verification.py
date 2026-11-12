"""Raw Core SQL for citizen verification confirmation."""
from sqlalchemy import text
from sqlalchemy.engine import Connection


def lock_complaint(connection: Connection, complaint_id: int) -> dict | None:
    row=connection.execute(text("""
      SELECT c.id,c.citizen_id,c.assigned_department_id,c.assigned_official_id,s.code AS status_code
      FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id
      WHERE c.id=:id FOR UPDATE
    """),{"id":complaint_id}).mappings().first()
    return dict(row) if row else None


def insert_confirmation(connection: Connection, complaint_id: int, citizen_id: int, note: str | None,
                        evidence_media_id: int | None, verdict: str = "confirmed") -> dict:
    result=connection.execute(text("""
      INSERT INTO complaint_verifications(complaint_id,citizen_id,verdict,note,evidence_media_id)
      VALUES(:complaint_id,:citizen_id,:verdict,:note,:evidence_media_id)
    """),{"complaint_id":complaint_id,"citizen_id":citizen_id,"verdict":verdict,"note":note,"evidence_media_id":evidence_media_id})
    return dict(connection.execute(text("""
      SELECT id,complaint_id,citizen_id,verdict,note,evidence_media_id,created_at
      FROM complaint_verifications WHERE id=:id
    """),{"id":result.lastrowid}).mappings().one())


def resolve_complaint(connection: Connection, complaint_id: int) -> None:
    connection.execute(text("""
      UPDATE complaints SET status_id=(SELECT id FROM complaint_statuses WHERE code='resolved'),
        verified_at=UTC_TIMESTAMP(3)
      WHERE id=:id AND status_id=(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification')
    """),{"id":complaint_id})


def write_history(connection: Connection, complaint_id: int, citizen_id: int, note: str | None) -> None:
    connection.execute(text("""
      INSERT INTO complaint_status_history(complaint_id,old_status_id,new_status_id,changed_by,change_source,note)
      SELECT :complaint_id,old_s.id,new_s.id,:citizen_id,'citizen',:note
      FROM complaint_statuses old_s JOIN complaint_statuses new_s
      WHERE old_s.code='resolved_pending_verification' AND new_s.code='resolved'
    """),{"complaint_id":complaint_id,"citizen_id":citizen_id,"note":note})


def write_audit(connection: Connection, complaint_id: int, citizen_id: int, verification_id: int) -> None:
    connection.execute(text("""
      INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data)
      VALUES(:citizen,'verification_confirmed','complaint',:entity_id,
        JSON_OBJECT('status','resolved_pending_verification'),JSON_OBJECT('status','resolved','verification_id',:verification_id))
    """),{"citizen":citizen_id,"entity_id":str(complaint_id),"verification_id":verification_id})


def add_completed_sla_event(connection: Connection, complaint_id: int, verification_id: int) -> None:
    connection.execute(text("""
      INSERT INTO sla_events(complaint_id,event_type,details)
      VALUES(:complaint_id,'completed',JSON_OBJECT('verification_id',:verification_id))
    """),{"complaint_id":complaint_id,"verification_id":verification_id})


def reject_and_reopen(connection: Connection, complaint_id: int, verification_id: int, reopen_hours: float) -> None:
    connection.execute(text("""
      UPDATE complaints SET status_id=(SELECT id FROM complaint_statuses WHERE code='reopened'),
        reopened_at=UTC_TIMESTAMP(3),
        due_at=TIMESTAMPADD(SECOND, CAST(:reopen_seconds AS SIGNED), UTC_TIMESTAMP(3))
      WHERE id=:id AND status_id=(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification')
    """),{"id":complaint_id,"reopen_seconds":int(reopen_hours*3600)})


def write_reopen_history(connection: Connection, complaint_id: int, citizen_id: int, note: str | None) -> None:
    connection.execute(text("""
      INSERT INTO complaint_status_history(complaint_id,old_status_id,new_status_id,changed_by,change_source,note)
      SELECT :complaint_id,old_s.id,new_s.id,:citizen_id,'citizen',:note
      FROM complaint_statuses old_s JOIN complaint_statuses new_s
      WHERE old_s.code='resolved_pending_verification' AND new_s.code='reopened'
    """),{"complaint_id":complaint_id,"citizen_id":citizen_id,"note":note})


def reopened_count(connection: Connection, complaint_id: int) -> int:
    return int(connection.execute(text("""
      SELECT COUNT(*) FROM complaint_status_history h JOIN complaint_statuses s ON s.id=h.new_status_id
      WHERE h.complaint_id=:id AND s.code='reopened'
    """),{"id":complaint_id}).scalar_one())


def add_due_sla_event(connection: Connection, complaint_id: int, verification_id: int, due_hours: float) -> None:
    connection.execute(text("""
      INSERT INTO sla_events(complaint_id,event_type,details)
      VALUES(:complaint_id,'due',JSON_OBJECT('verification_id',:verification_id,'cycle_hours',:cycle_hours,
        'due_at',DATE_FORMAT(TIMESTAMPADD(SECOND,CAST(:cycle_seconds AS SIGNED),UTC_TIMESTAMP(3)),'%Y-%m-%d %H:%i:%s.%f')))
    """),{"complaint_id":complaint_id,"verification_id":verification_id,"cycle_hours":due_hours,
          "cycle_seconds":int(due_hours*3600)})


def category_sla_hours(connection: Connection, complaint_id: int) -> float:
    return float(connection.execute(text("""
      SELECT cat.default_sla_hours FROM complaints c JOIN complaint_categories cat ON cat.id=c.category_id WHERE c.id=:id
    """),{"id":complaint_id}).scalar_one())
