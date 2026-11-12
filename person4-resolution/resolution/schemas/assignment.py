"""Complaint assignment API schemas."""
from pydantic import BaseModel, Field, model_validator


class AdminAssignment(BaseModel):
    department_id: int | None = None
    official_id: int | None = None
    note: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def has_target(self):
        if self.department_id is None and self.official_id is None:
            raise ValueError("department_id or official_id is required")
        return self


class AssignmentResult(BaseModel):
    complaint_id: int
    assigned_department_id: int | None
    assigned_official_id: int | None
    status_code: str
