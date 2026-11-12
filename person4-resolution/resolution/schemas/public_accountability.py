"""Public department-level accountability fields only."""
from pydantic import BaseModel


class DepartmentAccountability(BaseModel):
    department: str
    total_complaints: int
    average_response_hours: float | None
    sla_compliance_percent: float | None
    verified_resolution_rate: float | None
