"""Citizen verification request/response schemas."""
from datetime import datetime
from pydantic import BaseModel, Field


class VerificationCreate(BaseModel):
    verdict: str = Field(pattern="^(confirmed|rejected)$")
    note: str | None = None
    evidence_media_id: int | None = Field(default=None, gt=0)


class VerificationResult(BaseModel):
    id: int
    complaint_id: int
    citizen_id: int
    verdict: str
    note: str | None
    evidence_media_id: int | None
    created_at: datetime
    status_code: str
