"""Authorization and atomic creation for official responses."""
from fastapi import HTTPException
from sqlalchemy.engine import Connection

from ..repositories.notifications import get_recipients, notify
from ..repositories.responses import complaint_for_response, create_response, write_response_audit
from ..security import CurrentUser
from .notifications import OFFICIAL_RESPONSE


def post_response(connection: Connection, user: CurrentUser, complaint_id: int, body: str, is_public: bool) -> dict:
    complaint = complaint_for_response(connection, complaint_id)
    if complaint is None:
        raise HTTPException(404, {"detail": "Complaint not found", "code": "COMPLAINT_NOT_FOUND"})
    if user.role == "official":
        if user.department_id is None or complaint["assigned_department_id"] != user.department_id and complaint["assigned_official_id"] != user.id:
            raise HTTPException(403, {"detail": "Complaint is outside your assignment", "code": "FORBIDDEN_COMPLAINT"})
    elif user.role != "pasig_admin":
        raise HTTPException(403, {"detail": "Only officials and admins may respond", "code": "FORBIDDEN_ROLE"})

    response = create_response(connection, complaint_id, user.id, body, is_public)
    if response is None:
        raise HTTPException(404, {"detail": "Complaint not found", "code": "COMPLAINT_NOT_FOUND"})
    write_response_audit(connection, user.id, complaint_id, response["id"], body, is_public)
    if is_public:
        for recipient_id in get_recipients(connection, complaint_id, OFFICIAL_RESPONSE):
            notify(connection, recipient_id, complaint_id, OFFICIAL_RESPONSE, "Official response", body)
    return response
