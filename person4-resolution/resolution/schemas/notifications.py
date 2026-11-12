"""Notification API schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class NotificationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    complaint_id: int | None
    notification_type: str
    title: str
    message: str
    read_at: datetime | None
    created_at: datetime


class NotificationPage(BaseModel):
    items: list[NotificationItem]
    total: int
    page: int
    page_size: int


class UnreadCount(BaseModel):
    count: int


class MarkReadResult(BaseModel):
    updated: int


class NotificationListQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    unread: bool | None = None
