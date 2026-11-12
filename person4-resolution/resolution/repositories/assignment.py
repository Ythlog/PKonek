"""Raw Core SQL assignment persistence."""
from sqlalchemy import text
from sqlalchemy.engine import Connection


def lock_complaint(connection: Connection, complaint_id: int) -> dict | None:
    row = connection.execute(text("""
        SELECT c.id,c.category_id,c.citizen_id,c.assigned_department_id,c.assigned_official_id,
               s.code AS status_code
        FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id
        WHERE c.id=:id FOR UPDATE
    """), {"id": complaint_id}).mappings().first()
    return dict(row) if row else None


def auto_department(connection: Connection, category_id: int) -> int | None:
    return connection.execute(text("""
        SELECT department_id FROM category_department_routes
        WHERE category_id=:category_id AND is_active=TRUE
        ORDER BY priority ASC, id ASC LIMIT 1
    """), {"category_id": category_id}).scalar_one_or_none()


def official_department(connection: Connection, official_id: int) -> int | None:
    return connection.execute(text("SELECT department_id FROM official_profiles WHERE user_id=:id"), {"id": official_id}).scalar_one_or_none()


def update_assignment(connection: Connection, complaint_id: int, department_id: int | None, official_id: int | None,
                      *, status_code: str | None = None) -> None:
    if status_code is None:
        connection.execute(text("UPDATE complaints SET assigned_department_id=:department_id, assigned_official_id=:official_id WHERE id=:id"),
                           {"department_id": department_id, "official_id": official_id, "id": complaint_id})
    else:
        connection.execute(text("""
            UPDATE complaints SET assigned_department_id=:department_id, assigned_official_id=:official_id,
              status_id=(SELECT id FROM complaint_statuses WHERE code=:status_code) WHERE id=:id
        """), {"department_id": department_id, "official_id": official_id, "status_code": status_code, "id": complaint_id})


def write_assignment_audit(connection: Connection, actor_id: int, complaint_id: int, before: dict, after: dict, note: str | None) -> None:
    connection.execute(text("""
      INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data)
      VALUES(:actor,'assignment_changed','complaint',:entity_id,
        JSON_OBJECT('assigned_department_id',:old_department,'assigned_official_id',:old_official,'status_code',:old_status),
        JSON_OBJECT('assigned_department_id',:new_department,'assigned_official_id',:new_official,'status_code',:new_status,'note',:note))
    """), {"actor":actor_id,"entity_id":str(complaint_id),"old_department":before["assigned_department_id"],
      "old_official":before["assigned_official_id"],"old_status":before["status_code"],
      "new_department":after["assigned_department_id"],"new_official":after["assigned_official_id"],
      "new_status":after["status_code"],"note":note})


def write_status_history(connection: Connection, complaint_id: int, old_code: str, new_code: str, actor_id: int, note: str | None) -> None:
    connection.execute(text("""
      INSERT INTO complaint_status_history(complaint_id,old_status_id,new_status_id,changed_by,change_source,note)
      SELECT :complaint_id, old_s.id, new_s.id, :actor_id, 'official', :note
      FROM complaint_statuses old_s JOIN complaint_statuses new_s
      WHERE old_s.code=:old_code AND new_s.code=:new_code
    """), {"complaint_id":complaint_id,"actor_id":actor_id,"note":note,"old_code":old_code,"new_code":new_code})
