"""ORM models mirroring schema.sql (schema.sql is the source of truth)."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.mysql import BIGINT, INTEGER
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import UserDefinedType

BigId = BIGINT(unsigned=True)
IntId = INTEGER(unsigned=True)


class Point(UserDefinedType):
    """MySQL POINT SRID 4326.

    Python side is WKT ``"POINT(lng lat)"``. Writes go through ST_GeomFromText with
    long-lat axis order, so the ORM never sends raw geometry bytes.
    """

    cache_ok = True

    def get_col_spec(self, **kw):
        return "POINT SRID 4326"

    def bind_expression(self, bindvalue):
        return func.ST_GeomFromText(bindvalue, 4326, "axis-order=long-lat")

    def column_expression(self, col):
        return func.ST_AsText(col, "axis-order=long-lat")


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigId, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(150))
    role: Mapped[str] = mapped_column(String(20))
    barangay: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AccountActivityLog(Base):
    __tablename__ = "account_activity_logs"

    id: Mapped[int] = mapped_column(BigId, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("users.id"))
    email: Mapped[str | None] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(50))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    details: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigId, primary_key=True, autoincrement=True)
    actor_user_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("users.id"))
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[int] = mapped_column(BigId)
    action: Mapped[str] = mapped_column(String(50))
    before_data: Mapped[dict | None] = mapped_column(JSON)
    after_data: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"

    id: Mapped[int] = mapped_column(IntId, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(BigId, primary_key=True, autoincrement=True)
    reference_no: Mapped[str] = mapped_column(String(20), unique=True)
    category_id: Mapped[int] = mapped_column(IntId, ForeignKey("complaint_categories.id"))
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    location: Mapped[str] = mapped_column(Point())
    address_text: Mapped[str | None] = mapped_column(String(255))
    barangay: Mapped[str | None] = mapped_column(String(100))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    reporter_name: Mapped[str | None] = mapped_column(String(150))
    reporter_contact: Mapped[str | None] = mapped_column(String(100))
    created_by_user_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("users.id"))
    report_count: Mapped[int] = mapped_column(IntId, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)


class ComplaintSupport(Base):
    __tablename__ = "complaint_supports"

    id: Mapped[int] = mapped_column(BigId, primary_key=True, autoincrement=True)
    complaint_id: Mapped[int] = mapped_column(BigId, ForeignKey("complaints.id"))
    reporter_contact: Mapped[str | None] = mapped_column(String(100))
    note: Mapped[str | None] = mapped_column(String(500))
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# Columns never copied into audit before/after JSON.
AUDIT_EXCLUDED_COLUMNS = {"password_hash", "location"}
