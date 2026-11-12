"""Person 3 complaint media upload API."""

from __future__ import annotations

import io
import uuid
from pathlib import Path
from typing import Annotated

import jwt
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings, SettingsConfigDict
from PIL import Image, UnidentifiedImageError
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from supabase import create_client


ROOT = Path(__file__).resolve().parent
LUMEN_ROOT = ROOT.parent / "lumen"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=LUMEN_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = ""
    DB_SSL_CA: str = ""
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "complaint-media"
    MEDIA_MAX_SIZE_MB: int = 10

    def ssl_ca_path(self) -> Path | None:
        if not self.DB_SSL_CA:
            return None
        path = Path(self.DB_SSL_CA)
        return path if path.is_absolute() else (LUMEN_ROOT / path).resolve()


settings = Settings()
if not settings.DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set in lumen/.env")
if not settings.JWT_SECRET or settings.JWT_SECRET == "change-me":
    raise RuntimeError("Set a non-default JWT_SECRET in lumen/.env")
if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
    raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in lumen/.env")

connect_args: dict = {}
ca_path = settings.ssl_ca_path()
if ca_path:
    if not ca_path.is_file():
        raise RuntimeError(f"DB_SSL_CA file not found: {ca_path}")
    connect_args["ssl"] = {"ca": str(ca_path)}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=1800,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

app = FastAPI(title="PKonek Media API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
MAX_BYTES = settings.MEDIA_MAX_SIZE_MB * 1024 * 1024
ALLOWED_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
ALLOWED_MEDIA_TYPES = {"initial", "progress", "before", "after", "other"}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_staff(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="A valid staff access token is required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not authorization or not authorization.startswith("Bearer "):
        raise unauthorized
    token = authorization[7:].strip()
    try:
        claims = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = int(claims["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise unauthorized

    user = db.execute(
        text("SELECT id, role, is_active FROM users WHERE id = :id"), {"id": user_id}
    ).mappings().first()
    if not user or not user["is_active"]:
        raise unauthorized
    if user["role"] not in ("official", "pasig_admin"):
        raise HTTPException(status_code=403, detail="Staff access is required")
    return dict(user)


@app.get("/health")
def health():
    return {"status": "ok", "service": "media"}


@app.post("/complaints/{complaint_id}/media", status_code=status.HTTP_201_CREATED)
async def upload_complaint_media(
    complaint_id: int,
    file: Annotated[UploadFile, File()],
    media_type: Annotated[str, Form()] = "initial",
    db: Session = Depends(get_db),
    actor: dict = Depends(require_staff),
):
    if media_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported media_type")

    complaint = db.execute(
        text("SELECT id FROM complaints WHERE id = :id"), {"id": complaint_id}
    ).first()
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    payload = await file.read(MAX_BYTES + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    if len(payload) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"Maximum image size is {settings.MEDIA_MAX_SIZE_MB} MB")

    try:
        with Image.open(io.BytesIO(payload)) as image:
            image_format = image.format
            image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(status_code=415, detail="Upload a valid JPEG, PNG, or WebP image")

    mime_type = ALLOWED_FORMATS.get(image_format or "")
    if mime_type is None:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, and WebP images are accepted")

    suffix = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[mime_type]
    object_path = f"complaints/{complaint_id}/{uuid.uuid4().hex}.{suffix}"
    try:
        supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
            object_path,
            payload,
            file_options={"content-type": mime_type, "upsert": "false"},
        )
        storage_url = supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).get_public_url(object_path)
        result = db.execute(
            text("""
                INSERT INTO complaint_media
                    (complaint_id, uploaded_by, media_type, storage_url, mime_type,
                     file_size_bytes, original_filename)
                VALUES
                    (:complaint_id, :uploaded_by, :media_type, :storage_url, :mime_type,
                     :file_size_bytes, :original_filename)
            """),
            {
                "complaint_id": complaint_id,
                "uploaded_by": actor["id"],
                "media_type": media_type,
                "storage_url": storage_url,
                "mime_type": mime_type,
                "file_size_bytes": len(payload),
                "original_filename": (file.filename or "image")[:255],
            },
        )
        media_id = result.lastrowid
        db.commit()
        uploaded = db.execute(
            text("SELECT uploaded_at FROM complaint_media WHERE id = :id"), {"id": media_id}
        ).scalar_one()
    except Exception as exc:
        db.rollback()
        try:
            supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([object_path])
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Could not store the image and media record") from exc

    return {
        "id": media_id,
        "complaintId": complaint_id,
        "mediaType": media_type,
        "url": storage_url,
        "mimeType": mime_type,
        "fileSizeBytes": len(payload),
        "uploadedAt": uploaded.isoformat(),
    }
