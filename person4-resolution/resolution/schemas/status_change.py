"""Status transition request and response schemas."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class StatusChangeRequest(BaseModel):
    # Shown pre-filled in /docs instead of the generic "string" placeholder.
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"to_status": "in_progress", "note": "Crew scheduled for tomorrow"}]})

    to_status: str = Field(min_length=1, max_length=40)
    note: str | None = None
    after_media_id: int | None = Field(default=None, gt=0)


class StatusChangeResult(BaseModel):
    complaint_id: int
    old_status: str
    new_status: str
    changed_at: datetime
