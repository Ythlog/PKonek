"""Core SQL writes for official complaint responses."""
from sqlalchemy import text
from sqlalchemy.engine import Connection


def create_response(connection: Connection, complaint_id: int, author_id: int, body: str, is_public: bool) -> dict | None:
    row = connection.execute(text("""
        INSERT INTO complaint_responses (complaint_id, author_id, body, is_public)
        SELECT :complaint_id, :author_id, :body, :is_public
        WHERE EXISTS (SELECT 1 FROM complaints WHERE id=:complaint_id)
    """), {"complaint_id": complaint_id, "author_id": author_id, "body": body,
          "is_public": is_public}).lastrowid
    if not row:
        return None
    return dict(connection.execute(text("""
        SELECT id, complaint_id, author_id, body, is_public, created_at
        FROM complaint_responses WHERE id=:id
    """), {"id": row}).mappings().one())


def complaint_for_response(connection: Connection, complaint_id: int) -> dict | None:
    result = connection.execute(text("""
        SELECT id, citizen_id, assigned_department_id, assigned_official_id, title
        FROM complaints WHERE id=:id FOR UPDATE
    """), {"id": complaint_id}).mappings().first()
    return dict(result) if result else None


def write_response_audit(connection: Connection, actor_id: int, complaint_id: int, response_id: int, body: str, is_public: bool) -> None:
    connection.execute(text("""
        INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
        VALUES (:actor, 'response_created', 'complaint_response', :entity_id,
                JSON_OBJECT('complaint_id', :complaint_id, 'body', :body, 'is_public', :is_public))
    """), {"actor": actor_id, "entity_id": str(response_id), "complaint_id": complaint_id,
          "body": body, "is_public": is_public})
