"""Confirmed citizen verification orchestration."""
from fastapi import HTTPException
from sqlalchemy.engine import Connection

from ..repositories.notifications import get_recipients, notify
from ..repositories.verification import (add_completed_sla_event, insert_confirmation,
    lock_complaint, resolve_complaint, write_audit, write_history)
from ..security import CurrentUser
from .notifications import COMPLAINT_RESOLVED


def submit_verification(connection: Connection, user: CurrentUser, complaint_id: int, verdict: str,
                        note: str | None, evidence_media_id: int | None) -> dict:
    if verdict == "rejected":
        raise HTTPException(400,{"detail":"Rejected verification is not available yet","code":"VERIFICATION_REJECT_UNAVAILABLE"})
    if verdict != "confirmed":
        raise HTTPException(422,{"detail":"Unsupported verification verdict","code":"INVALID_VERDICT"})
    complaint=lock_complaint(connection,complaint_id)
    if complaint is None:
        raise HTTPException(404,{"detail":"Complaint not found","code":"COMPLAINT_NOT_FOUND"})
    if user.role != "citizen" or user.id != complaint["citizen_id"]:
        raise HTTPException(403,{"detail":"Only the original citizen may verify this complaint","code":"FORBIDDEN_COMPLAINT"})
    if complaint["status_code"] != "resolved_pending_verification":
        raise HTTPException(409,{"detail":"Complaint is not awaiting verification","code":"INVALID_VERIFICATION_STATE"})
    verification=insert_confirmation(connection,complaint_id,user.id,note,evidence_media_id)
    resolve_complaint(connection,complaint_id)
    write_history(connection,complaint_id,user.id,note)
    write_audit(connection,complaint_id,user.id,verification["id"])
    add_completed_sla_event(connection,complaint_id,verification["id"])
    for recipient in get_recipients(connection,complaint_id,COMPLAINT_RESOLVED):
        notify(connection,recipient,complaint_id,COMPLAINT_RESOLVED,"Complaint resolution confirmed","The citizen confirmed this complaint is resolved.")
    return {**verification,"status_code":"resolved"}
