"""Validated status transition service; caller owns transaction boundary."""
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.engine import Connection

from ..domain.state_machine import Actor, TransitionError, validate_transition
from ..repositories.notifications import get_recipients, notify
from ..repositories.status_change import (has_after_media, lock_complaint, set_status, write_audit, write_history)
from ..security import CurrentUser
from .notifications import (COMPLAINT_REOPENED, COMPLAINT_RESOLVED, STATUS_CHANGED,
                            VERIFICATION_REQUESTED)


def _error(code: str, detail: str, status: int = 409):
    return HTTPException(status, {"detail":detail,"code":code})


def change_status(connection: Connection, user: CurrentUser, complaint_id: int, to_status: str,
                  note: str | None, after_media_id: int | None) -> dict:
    complaint=lock_complaint(connection,complaint_id)
    if complaint is None:
        raise _error("COMPLAINT_NOT_FOUND","Complaint not found",404)
    if user.role == "citizen":
        actor=Actor.CITIZEN
        if complaint["citizen_id"] != user.id:
            raise _error("FORBIDDEN_COMPLAINT","You may only change your own complaint")
    elif user.role == "official":
        actor=Actor.OFFICIAL
        if complaint["assigned_department_id"] != user.department_id and complaint["assigned_official_id"] != user.id:
            raise _error("FORBIDDEN_COMPLAINT","Complaint is outside your department and assignment",403)
    elif user.role == "pasig_admin":
        actor=Actor.ADMIN
    else:
        raise _error("FORBIDDEN_ROLE","Unsupported actor role",403)
    after_exists=has_after_media(connection,complaint_id,after_media_id)
    try:
        validate_transition(complaint["status_code"],to_status,actor,note=note,has_after_photo=after_exists)
    except TransitionError as exc:
        code=exc.code
        raise _error("INVALID_TRANSITION" if code=="INVALID_TRANSITION" else code,str(exc)) from exc

    set_status(connection,complaint_id,complaint["status_code"],to_status)
    source={Actor.CITIZEN:"citizen",Actor.OFFICIAL:"official",Actor.ADMIN:"admin"}[actor]
    write_history(connection,complaint_id,complaint["status_code"],to_status,user.id,source,note)
    write_audit(connection,complaint_id,user.id,complaint["status_code"],to_status,note,after_media_id if after_exists else None)
    if to_status=="resolved_pending_verification" and actor is Actor.OFFICIAL:
        recipients=[int(complaint["citizen_id"])]
        event_type=VERIFICATION_REQUESTED
        title="Please verify the resolution"
        message=note or "An official marked this complaint as done. Please verify the resolution."
    else:
        recipients=get_recipients(connection,complaint_id,COMPLAINT_REOPENED if to_status=="reopened" else STATUS_CHANGED)
        event_type=COMPLAINT_REOPENED if to_status=="reopened" else COMPLAINT_RESOLVED if to_status=="resolved" else STATUS_CHANGED
        title="Complaint status updated"
        message=note or f"Complaint status changed to {to_status}."
    for recipient in set(recipients):
        notify(connection,recipient,complaint_id,event_type,title,message)
    changed_at=datetime.now(timezone.utc)
    return {"complaint_id":complaint_id,"old_status":complaint["status_code"],"new_status":to_status,"changed_at":changed_at}
