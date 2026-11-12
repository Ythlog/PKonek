import jwt
import pytest
from pydantic import ValidationError

from accounts_complaints.config import Settings
from accounts_complaints.schemas import ComplaintCreate, UserCreate
from accounts_complaints.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_settings_defaults():
    s = Settings(DATABASE_URL="")
    assert s.DUP_RADIUS_M == 50
    assert s.DUP_WINDOW_DAYS == 7
    assert s.PASIG_MIN_LAT < s.PASIG_MAX_LAT and s.PASIG_MIN_LNG < s.PASIG_MAX_LNG


def test_password_hash_round_trip():
    h = hash_password("correct horse")
    assert h != "correct horse"
    assert verify_password("correct horse", h)
    assert not verify_password("wrong", h)
    assert not verify_password("x", "not-a-bcrypt-hash")


def test_token_round_trip():
    payload = decode_access_token(create_access_token(42, "official"))
    assert payload["sub"] == "42" and payload["role"] == "official"


def test_expired_token_rejected():
    token = create_access_token(1, "pasig_admin", expires_minutes=-1)
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_tampered_token_rejected():
    token = create_access_token(1, "official")
    forged = jwt.encode({"sub": "1", "role": "pasig_admin", "exp": 9999999999}, "other-secret", algorithm="HS256")
    with pytest.raises(jwt.InvalidSignatureError):
        decode_access_token(forged)
    assert decode_access_token(token)["role"] == "official"


BASE = {"category_id": 1, "title": "Pothole", "description": "Big pothole on the road"}


def test_complaint_requires_pin():
    with pytest.raises(ValidationError) as exc:
        ComplaintCreate(**BASE)
    fields = {e["loc"][0] for e in exc.value.errors()}
    assert {"latitude", "longitude"} <= fields


def test_complaint_rejects_nan_pin():
    with pytest.raises(ValidationError):
        ComplaintCreate(**BASE, latitude=float("nan"), longitude=121.08)


def test_user_create_validation():
    with pytest.raises(ValidationError):
        UserCreate(email="not-an-email", password="longenough", full_name="A")
    with pytest.raises(ValidationError):
        UserCreate(email="a@b.ph", password="short", full_name="A")
    with pytest.raises(ValidationError):
        UserCreate(email="a@b.ph", password="longenough", full_name="A", role="citizen")
    assert UserCreate(email="a@b.ph", password="longenough", full_name="A").role == "official"
