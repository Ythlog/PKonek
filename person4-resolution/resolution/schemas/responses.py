"""Official response request/response schemas."""
from datetime import datetime
from pydantic import BaseModel, Field


class ResponseCreate(BaseModel):
    body: str = Field(min_length=1)
    is_public: bool = True


class ResponseCreated(BaseModel):
    id: int
    complaint_id: int
    author_id: int
    body: str
    is_public: bool
    created_at: datetime
