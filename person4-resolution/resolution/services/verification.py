"""Confirmed citizen verification orchestration."""
from fastapi import HTTPException
from sqlalchemy.engine import Connection

from ..repositories.notifications import get_recipients, notify
from ..repositories.verification import (add_completed_sla_event, insert_confirmation,
    lock_complaint, resolve_complaint, write_audit, write_history, reject_and_reopen,
    write_reopen_history, reopened_count, add_due_sla_event, category_sla_hours)
from ..security import CurrentUser
from ..config import get_settings
from .comparison import BeforeAfterComparer, NullComparer
from .notifications import COMPLAINT_RESOLVED, COMPLAINT_REOPENED

_comparer: BeforeAfterComparer = NullComparer()


def submit_verification(connection: Connection, user: CurrentUser, complaint_id: int, verdict: str,
                        note: str | None, evidence_media_id: int | None) -> dict:
    if verdict not in {"confirmed", "rejected"}:
        raise HTTPException(422,{"detail":"Unsupported verification verdict","code":"INVALID_VERDICT"})
    complaint=lock_complaint(connection,complaint_id)
    if complaint is None:
        raise HTTPException(404,{"detail":"Complaint not found","code":"COMPLAINT_NOT_FOUND"})
    if user.role != "citizen" or user.id != complaint["citizen_id"]:
        raise HTTPException(403,{"detail":"Only the original citizen may verify this complaint","code":"FORBIDDEN_COMPLAINT"})
    if complaint["status_code"] != "resolved_pending_verification":
        raise HTTPException(409,{"detail":"Complaint is not awaiting verification","code":"INVALID_VERIFICATION_STATE"})
    if verdict == "confirmed":
        before_id=connection.execute(__import__('sqlalchemy').text("SELECT id FROM complaint_media WHERE complaint_id=:id AND media_type='before' ORDER BY uploaded_at,id LIMIT 1"),{"id":complaint_id}).scalar_one_or_none()
        comparison=None
        if before_id is not None and evidence_media_id is not None:
            comparison=_comparer.compare(complaint_id,int(before_id),evidence_media_id)
        verification=insert_confirmation(connection,complaint_id,user.id,note,evidence_media_id,ai_comparison=comparison)
        resolve_complaint(connection,complaint_id)
        write_history(connection,complaint_id,user.id,note)
        write_audit(connection,complaint_id,user.id,verification["id"])
        add_completed_sla_event(connection,complaint_id,verification["id"])
        recipients=set(get_recipients(connection,complaint_id,COMPLAINT_RESOLVED))
        if complaint["assigned_official_id"] is not None:
            recipients.add(int(complaint["assigned_official_id"]))
        for recipient in sorted(recipients):
            notify(connection,recipient,complaint_id,COMPLAINT_RESOLVED,"Complaint resolution confirmed","The citizen confirmed this complaint is resolved.")
        return {**verification,"status_code":"resolved"}

    verification=insert_confirmation(connection,complaint_id,user.id,note,evidence_media_id,verdict="rejected")
    settings=get_settings()
    hours=max(category_sla_hours(connection,complaint_id)*settings.reopen_sla_ratio,settings.reopen_sla_min_hours)
    reject_and_reopen(connection,complaint_id,verification["id"],hours)
    write_reopen_history(connection,complaint_id,user.id,note)
    write_audit(connection,complaint_id,user.id,verification["id"])
    add_due_sla_event(connection,complaint_id,verification["id"],hours)
    recipients=get_recipients(connection,complaint_id,COMPLAINT_REOPENED)
    for recipient in recipients:
        notify(connection,recipient,complaint_id,COMPLAINT_REOPENED,"Complaint reopened","The citizen rejected the proposed resolution.")
    if reopened_count(connection,complaint_id)>=2:
        admins=connection.execute(__import__('sqlalchemy').text("""
          SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id
          WHERE r.name='pasig_admin' AND u.account_status='active'
        """)).scalars().all()
        for admin_id in admins:
            notify(connection,int(admin_id),complaint_id,COMPLAINT_REOPENED,"Repeatedly reopened complaint","This complaint has been reopened at least twice.")
    verification["verdict"]="rejected"
    return {**verification,"status_code":"reopened"}
