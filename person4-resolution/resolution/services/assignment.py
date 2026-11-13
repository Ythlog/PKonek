"""Assignment orchestration; all database effects share the caller's transaction."""
from fastapi import HTTPException
from sqlalchemy.engine import Connection

from ..domain.state_machine import Actor, TransitionError, validate_transition
from ..repositories.assignment import (auto_department, lock_complaint, official_department,
    update_assignment, write_assignment_audit, write_status_history)
from ..repositories.notifications import get_recipients, notify
from ..security import CurrentUser
from .notifications import ASSIGNED


def _http(status: int, detail: str, code: str):
    return HTTPException(status, {"detail": detail, "code": code})


def _allowed_official(user: CurrentUser, complaint: dict) -> bool:
    return user.role == "official" and (complaint["assigned_department_id"] == user.department_id or complaint["assigned_official_id"] == user.id)


def claim_complaint(connection: Connection, user: CurrentUser, complaint_id: int) -> dict:
    if user.role != "official":
        raise _http(403, "Only officials may claim complaints", "FORBIDDEN_ROLE")
    complaint = lock_complaint(connection, complaint_id)
    if complaint is None:
        raise _http(404, "Complaint not found", "COMPLAINT_NOT_FOUND")
    unassigned_routed_here = (
        complaint["assigned_department_id"] is None and complaint["assigned_official_id"] is None
        and user.department_id is not None
        and auto_department(connection, complaint["category_id"]) == user.department_id
    )
    if not (_allowed_official(user, complaint) or unassigned_routed_here):
        raise _http(403, "Complaint is outside your department and assignment", "FORBIDDEN_COMPLAINT")
    try:
        validate_transition(complaint["status_code"], "under_review", Actor.OFFICIAL)
    except TransitionError as exc:
        raise _http(409, str(exc), exc.code) from exc
    before = complaint.copy()
    department = complaint["assigned_department_id"] or user.department_id
    after = {**complaint, "assigned_department_id": department, "assigned_official_id": user.id, "status_code": "under_review"}
    update_assignment(connection, complaint_id, department, user.id, status_code="under_review")
    write_status_history(connection, complaint_id, complaint["status_code"], "under_review", user.id, "Claimed by official")
    write_assignment_audit(connection, user.id, complaint_id, before, after, "Claimed by official")
    for recipient in get_recipients(connection, complaint_id, ASSIGNED):
        notify(connection, recipient, complaint_id, ASSIGNED, "Complaint assigned", "An official claimed this complaint")
    return {"complaint_id": complaint_id, "assigned_department_id": department, "assigned_official_id": user.id, "status_code": "under_review"}


def admin_assign(connection: Connection, user: CurrentUser, complaint_id: int, department_id: int | None,
                 official_id: int | None, note: str) -> dict:
    if user.role != "pasig_admin":
        raise _http(403, "Only admins may assign or reassign complaints", "FORBIDDEN_ROLE")
    complaint = lock_complaint(connection, complaint_id)
    if complaint is None:
        raise _http(404, "Complaint not found", "COMPLAINT_NOT_FOUND")
    if official_id is not None:
        official_dept = official_department(connection, official_id)
        if official_dept is None:
            raise _http(422, "Official has no department profile", "INVALID_OFFICIAL")
        if department_id is not None and department_id != official_dept:
            raise _http(422, "Official does not belong to the selected department", "OFFICIAL_DEPARTMENT_MISMATCH")
        department_id = official_dept
    before = complaint.copy()
    after = {**complaint, "assigned_department_id": department_id if department_id is not None else complaint["assigned_department_id"],
             "assigned_official_id": official_id if official_id is not None else complaint["assigned_official_id"]}
    update_assignment(connection, complaint_id, after["assigned_department_id"], after["assigned_official_id"])
    write_assignment_audit(connection, user.id, complaint_id, before, after, note)
    for recipient in get_recipients(connection, complaint_id, ASSIGNED):
        notify(connection, recipient, complaint_id, ASSIGNED, "Complaint assignment updated", note)
    return {"complaint_id": complaint_id, "assigned_department_id": after["assigned_department_id"],
            "assigned_official_id": after["assigned_official_id"], "status_code": complaint["status_code"]}


def auto_assign(connection: Connection, complaint_id: int, actor_id: int | None = None) -> int | None:
    """Assign lowest-priority active category route; leave unroutable complaints NULL."""
    complaint = lock_complaint(connection, complaint_id)
    if complaint is None:
        raise _http(404, "Complaint not found", "COMPLAINT_NOT_FOUND")
    department_id = auto_department(connection, complaint["category_id"])
    if department_id is None:
        return None
    before = complaint.copy()
    after = {**complaint, "assigned_department_id": department_id, "assigned_official_id": None}
    update_assignment(connection, complaint_id, department_id, None)
    write_assignment_audit(connection, actor_id, complaint_id, before, after, "Automatic category routing")
    for recipient in get_recipients(connection, complaint_id, ASSIGNED):
        notify(connection, recipient, complaint_id, ASSIGNED, "Complaint routed", "Complaint assigned to your department")
    return department_id
