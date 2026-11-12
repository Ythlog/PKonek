"""Pasig admin overview response schemas."""
from pydantic import BaseModel


class OverviewCards(BaseModel):
    total: int
    open: int
    overdue: int
    escalated: int
    resolved: int
    reopen_rate: float | None


class GroupCount(BaseModel):
    key: str
    label: str
    count: int


class AdminOverview(BaseModel):
    cards: OverviewCards
    by_status: list[GroupCount]
    by_category: list[GroupCount]
    by_severity: list[GroupCount]
