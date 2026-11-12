"""Admin trend and complaint-list schemas."""
from datetime import datetime
from pydantic import BaseModel


class DailyTrend(BaseModel):
    date: str
    submitted: int
    resolved: int
    reopened: int


class AdminComplaintListItem(BaseModel):
    id: int
    public_id: str | None
    title: str
    category_id: int
    category_name: str
    status_code: str
    assigned_department_id: int | None
    assigned_official_id: int | None
    submitted_at: datetime
    due_at: datetime | None
    escalation_level: int | None


class AdminComplaintPage(BaseModel):
    items: list[AdminComplaintListItem]
    total: int
    page: int
    page_size: int
