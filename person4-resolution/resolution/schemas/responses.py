"""Official response request/response schemas."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ResponseCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"body": "Asphalt patching is 50% done.", "is_public": True}]})

    body: str = Field(min_length=1)
    is_public: bool = True


class ResponseCreated(BaseModel):
    id: int
    complaint_id: int
    author_id: int
    body: str
    is_public: bool
    created_at: datetime
