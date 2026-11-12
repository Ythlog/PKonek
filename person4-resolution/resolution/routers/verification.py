"""Citizen complaint verification endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from ..db import engine
from ..schemas.verification import VerificationCreate, VerificationResult
from ..security import CurrentUser, get_current_user
from ..services.verification import submit_verification

router=APIRouter(tags=["verification"])


@router.post("/complaints/{complaint_id}/verification",response_model=VerificationResult,status_code=201)
def verify_complaint(complaint_id:int,payload:VerificationCreate,user:CurrentUser=Depends(get_current_user)):
    try:
        with engine.begin() as connection:
            return submit_verification(connection,user,complaint_id,payload.verdict,payload.note,payload.evidence_media_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503,{"detail":"Could not submit verification","code":"VERIFICATION_UNAVAILABLE"}) from exc
