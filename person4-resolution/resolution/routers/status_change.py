"""Complaint status change endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from ..db import engine
from ..schemas.status_change import StatusChangeRequest, StatusChangeResult
from ..security import CurrentUser, get_current_user
from ..services.status_change import change_status

router=APIRouter(tags=["status"])


@router.post("/complaints/{complaint_id}/status",response_model=StatusChangeResult)
def post_status_change(complaint_id:int,payload:StatusChangeRequest,user:CurrentUser=Depends(get_current_user)):
    try:
        with engine.begin() as connection:
            return change_status(connection,user,complaint_id,payload.to_status,payload.note,payload.after_media_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503,{"detail":"Could not change complaint status","code":"STATUS_CHANGE_UNAVAILABLE"}) from exc
