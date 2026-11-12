"""Audit trail: before/after snapshots written in the same transaction as the change."""
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from ..models import AUDIT_EXCLUDED_COLUMNS, AuditLog


def _json_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def snapshot(obj: Any) -> dict:
    """Column values of an ORM object as JSON-safe dict, without secrets/geometry."""
    mapper = inspect(obj).mapper
    return {
        attr.key: _json_value(getattr(obj, attr.key))
        for attr in mapper.column_attrs
        if attr.key not in AUDIT_EXCLUDED_COLUMNS
    }


def diff(before: dict, after: dict) -> tuple[dict, dict]:
    """Keep only the fields that changed (ignores updated_at)."""
    changed = [k for k in after if before.get(k) != after.get(k) and k != "updated_at"]
    return {k: before.get(k) for k in changed}, {k: after.get(k) for k in changed}


def record(
    db: Session,
    *,
    actor_user_id: int | None,
    entity_type: str,
    entity_id: int,
    action: str,
    before: dict | None = None,
    after: dict | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        before_data=before,
        after_data=after,
        ip_address=ip_address,
    )
    db.add(entry)
    return entry
