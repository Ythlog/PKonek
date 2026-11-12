"""Raw Core SQL for locked complaint status changes."""
from sqlalchemy import text
from sqlalchemy.engine import Connection


def lock_complaint(connection: Connection, complaint_id: int) -> dict | None:
    row = connection.execute(text("""
      SELECT c.id,c.citizen_id,c.assigned_department_id,c.assigned_official_id,s.code AS status_code
      FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id
      WHERE c.id=:id FOR UPDATE
    """), {"id":complaint_id}).mappings().first()
    return dict(row) if row else None


def has_after_media(connection: Connection, complaint_id: int, media_id: int | None) -> bool:
    if media_id is None:
        return False
    return connection.execute(text("""
      SELECT 1 FROM complaint_media
      WHERE id=:media_id AND complaint_id=:complaint_id AND media_type='after'
    """), {"media_id":media_id,"complaint_id":complaint_id}).first() is not None


def set_status(connection: Connection, complaint_id: int, old_status: str, new_status: str) -> None:
    connection.execute(text("""
      UPDATE complaints SET status_id=(SELECT id FROM complaint_statuses WHERE code=:new_status),
        resolved_at=CASE WHEN :new_status='resolved_pending_verification' THEN UTC_TIMESTAMP(3) ELSE resolved_at END
      WHERE id=:id AND status_id=(SELECT id FROM complaint_statuses WHERE code=:old_status)
    """), {"id":complaint_id,"old_status":old_status,"new_status":new_status})


def write_history(connection: Connection, complaint_id: int, old_status: str, new_status: str,
                  actor_id: int | None, source: str, note: str | None) -> None:
    connection.execute(text("""
      INSERT INTO complaint_status_history(complaint_id,old_status_id,new_status_id,changed_by,change_source,note)
      SELECT :complaint_id,old_s.id,new_s.id,:actor_id,:source,:note
      FROM complaint_statuses old_s JOIN complaint_statuses new_s
      WHERE old_s.code=:old_status AND new_s.code=:new_status
    """), {"complaint_id":complaint_id,"actor_id":actor_id,"source":source,"note":note,
          "old_status":old_status,"new_status":new_status})


def write_audit(connection: Connection, complaint_id: int, actor_id: int | None, old_status: str,
                new_status: str, note: str | None, after_media_id: int | None) -> None:
    connection.execute(text("""
      INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data)
      VALUES(:actor_id,'status_changed','complaint',:entity_id,JSON_OBJECT('status',:old_status),
        JSON_OBJECT('status',:new_status,'note',:note,'after_media_id',:after_media_id))
    """), {"actor_id":actor_id,"entity_id":str(complaint_id),"old_status":old_status,
          "new_status":new_status,"note":note,"after_media_id":after_media_id})
