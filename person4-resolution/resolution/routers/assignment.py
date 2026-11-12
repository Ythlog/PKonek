"""Claim, administrator assignment, and routing endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import engine
from ..schemas.assignment import AdminAssignment, AssignmentResult
from ..security import CurrentUser, get_current_user
from ..services.assignment import admin_assign, claim_complaint

router = APIRouter(tags=["assignment"])


class ClaimRequest(BaseModel):
    pass


@router.post("/complaints/{complaint_id}/claim", response_model=AssignmentResult)
def claim(complaint_id: int, user: CurrentUser = Depends(get_current_user)):
    try:
        with engine.begin() as connection:
            return claim_complaint(connection, user, complaint_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, {"detail": "Could not claim complaint", "code": "ASSIGNMENT_UNAVAILABLE"}) from exc


@router.put("/complaints/{complaint_id}/assignment", response_model=AssignmentResult)
def assign(complaint_id: int, payload: AdminAssignment, user: CurrentUser = Depends(get_current_user)):
    try:
        with engine.begin() as connection:
            return admin_assign(connection, user, complaint_id, payload.department_id, payload.official_id, payload.note)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, {"detail": "Could not assign complaint", "code": "ASSIGNMENT_UNAVAILABLE"}) from exc
