"""Official queue response schemas."""
from datetime import datetime
from pydantic import BaseModel


class QueueItem(BaseModel):
    id: int
    public_id: str | None
    title: str
    description: str
    category_id: int
    category_name: str
    status_code: str
    ai_severity: str | None
    assigned_department_id: int | None
    assigned_official_id: int | None
    submitted_at: datetime
    due_at: datetime | None
    support_count: int
    is_overdue: bool
    time_left_seconds: int | None


class QueuePage(BaseModel):
    items: list[QueueItem]
    total: int
    page: int
    page_size: int
