"""Admin performance metric response schemas."""
from pydantic import BaseModel


class VerificationRate(BaseModel):
    key: str
    label: str | None
    confirmed: int
    rejected: int
    rate: float | None


class ResponseTimeStats(BaseModel):
    average_first_response_seconds: float | None
    average_resolution_seconds: float | None
    sla_compliance_percent: float | None


class AdminPerformance(BaseModel):
    per_official: list[VerificationRate]
    per_department: list[VerificationRate]
    response_time: ResponseTimeStats
