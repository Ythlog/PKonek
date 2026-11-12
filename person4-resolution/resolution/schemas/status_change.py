"""Status transition request and response schemas."""
from datetime import datetime
from pydantic import BaseModel, Field


class StatusChangeRequest(BaseModel):
    to_status: str = Field(min_length=1, max_length=40)
    note: str | None = None
    after_media_id: int | None = Field(default=None, gt=0)


class StatusChangeResult(BaseModel):
    complaint_id: int
    old_status: str
    new_status: str
    changed_at: datetime
