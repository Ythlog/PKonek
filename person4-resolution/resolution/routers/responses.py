"""Complaint response endpoint."""
from fastapi import APIRouter, Depends, HTTPException

from ..db import engine
from ..schemas.responses import ResponseCreate, ResponseCreated
from ..security import CurrentUser, get_current_user
from ..services.responses import post_response

router = APIRouter(tags=["responses"])


@router.post("/complaints/{complaint_id}/responses", response_model=ResponseCreated, status_code=201)
def create_complaint_response(complaint_id: int, payload: ResponseCreate,
                              user: CurrentUser = Depends(get_current_user)):
    try:
        with engine.begin() as connection:
            return post_response(connection, user, complaint_id, payload.body, payload.is_public)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, {"detail": "Could not create response", "code": "RESPONSE_UNAVAILABLE"}) from exc
