"""Pydantic request/response models."""
from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Basic shape check; avoids adding the email-validator dependency.
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

Role = Literal["official", "pasig_admin"]
ComplaintStatus = Literal["open", "in_progress", "resolved", "rejected"]

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


# ---------- Auth / users ----------
class LoginRequest(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=1, max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: Role


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: Role
    barangay: str | None
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime


class UserCreate(BaseModel):
    email: str = Field(max_length=255, pattern=EMAIL_PATTERN)
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=150)
    role: Role = "official"
    barangay: str | None = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def password_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 bytes")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    role: Role | None = None
    barangay: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=72)


# ---------- Logs ----------
class ActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    email: str | None
    action: str
    ip_address: str | None
    user_agent: str | None
    details: dict | None
    created_at: datetime


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_user_id: int | None
    entity_type: str
    entity_id: int
    action: str
    before_data: dict | None
    after_data: dict | None
    ip_address: str | None
    created_at: datetime


# ---------- Categories ----------
class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str | None
    is_active: bool


class CategoryCreate(BaseModel):
    code: str = Field(min_length=2, max_length=50, pattern=r"^[a-z0-9_]+$")
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


# ---------- Complaints ----------
class Pin(BaseModel):
    """Required location pin. Range checks here; Pasig bounds in services.location."""

    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)


class ComplaintCreate(Pin):
    category_id: int = Field(gt=0)
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=5, max_length=5000)
    address_text: str | None = Field(default=None, max_length=255)
    barangay: str | None = Field(default=None, max_length=100)
    photo_url: str | None = Field(default=None, max_length=500)
    reporter_name: str | None = Field(default=None, max_length=150)
    reporter_contact: str | None = Field(default=None, max_length=100)


class DuplicateCheckRequest(Pin):
    category_id: int = Field(gt=0)


class DuplicateCandidate(BaseModel):
    id: int
    reference_no: str
    title: str
    status: ComplaintStatus
    report_count: int
    distance_m: float
    created_at: datetime


class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    radius_m: float
    window_days: int
    candidates: list[DuplicateCandidate]


class SupportCreate(Pin):
    reporter_contact: str | None = Field(default=None, max_length=100)
    note: str | None = Field(default=None, max_length=500)


class StatusUpdate(BaseModel):
    status: ComplaintStatus
    note: str | None = Field(default=None, max_length=500)


class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_no: str
    category_id: int
    title: str
    description: str
    status: ComplaintStatus
    latitude: float
    longitude: float
    address_text: str | None
    barangay: str | None
    photo_url: str | None
    report_count: int
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None


class ComplaintStaffOut(ComplaintOut):
    """Adds reporter details; only returned to officials/admins."""

    reporter_name: str | None
    reporter_contact: str | None
    created_by_user_id: int | None
