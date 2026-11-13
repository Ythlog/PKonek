"""Lumen AI chat adapter for citizen complaint-writing assistance."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated, Any

import httpx
import jwt
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LUMEN_ENV_FILE = PROJECT_ROOT / "lumen" / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=LUMEN_ENV_FILE, env_file_encoding="utf-8", extra="ignore"
    )

    LUMEN_API_KEY: str = ""
    LUMEN_API_SECRET: str = ""
    LUMEN_API_BASE_URL: str = "https://api.staging.nonlive.lumen.bayanichain.tech"
    LUMEN_CHAT_INSTANCE_ID: str = ""
    LUMEN_CHAT_TIMEOUT_SECONDS: int = 90
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"


settings = Settings()
app = FastAPI(title="PKonek Lumen Chatbot", version="0.1.0")


class DraftRequest(BaseModel):
    message: str = Field(min_length=5, max_length=5000)


def lumen_headers() -> dict[str, str]:
    if not settings.LUMEN_API_KEY or not settings.LUMEN_API_SECRET:
        raise HTTPException(status_code=503, detail="Lumen API credentials are not configured")
    return {
        "lumen-api-key": settings.LUMEN_API_KEY,
        "lumen-api-secret": settings.LUMEN_API_SECRET,
        "Content-Type": "application/json",
    }


def raise_lumen_error(exc: Exception) -> None:
    if isinstance(exc, httpx.TimeoutException):
        raise HTTPException(status_code=504, detail="Lumen chat request timed out") from exc
    if isinstance(exc, httpx.HTTPStatusError):
        raise HTTPException(status_code=502, detail=f"Lumen chat returned HTTP {exc.response.status_code}") from exc
    raise HTTPException(status_code=502, detail="Could not reach Lumen chat") from exc


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "lumen-chatbot"}


@app.get("/instances")
async def list_instances() -> Any:
    """Proxy Lumen's instance listing for setup/diagnostics; does not expose secrets."""
    url = f"{settings.LUMEN_API_BASE_URL.rstrip('/')}/ai_chat/instances"
    try:
        async with httpx.AsyncClient(timeout=settings.LUMEN_CHAT_TIMEOUT_SECONDS) as client:
            response = await client.get(url, headers=lumen_headers())
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise_lumen_error(exc)


@app.post("/complaint-drafts")
async def create_complaint_draft(
    body: DraftRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Create a Lumen chat session, ask for a clearer complaint draft, return history."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer access token required")
    if not settings.JWT_SECRET or settings.JWT_SECRET == "change-me":
        raise HTTPException(status_code=503, detail="JWT_SECRET is not configured")
    try:
        claims = jwt.decode(
            authorization.split(" ", 1)[1].strip(),
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["sub", "role", "exp"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from exc
    if claims.get("role") != "citizen":
        raise HTTPException(status_code=403, detail="Citizen access is required")
    if not settings.LUMEN_CHAT_INSTANCE_ID:
        raise HTTPException(status_code=503, detail="LUMEN_CHAT_INSTANCE_ID is not configured")

    base = settings.LUMEN_API_BASE_URL.rstrip("/")
    instance_url = f"{base}/ai_chat/instances/{settings.LUMEN_CHAT_INSTANCE_ID}"
    headers = lumen_headers()
    prompt = (
        "Help a Pasig City resident write a clear, factual civic complaint. "
        "Preserve only details the resident provided; do not invent facts. "
        "Return a concise polished draft they can review and edit. Do not assess severity.\n\n"
        f"Resident's notes: {body.message.strip()}"
    )
    try:
        async with httpx.AsyncClient(timeout=settings.LUMEN_CHAT_TIMEOUT_SECONDS) as client:
            session_response = await client.post(
                f"{instance_url}/sessions",
                headers=headers,
                json={"title": "Complaint writing assistance"},
            )
            session_response.raise_for_status()
            session_data = session_response.json()
            session_id = session_data.get("id") or session_data.get("session_id")
            if not session_id:
                return {
                    "status": "session_created",
                    "session": session_data,
                    "message": "Lumen did not return a recognizable session ID; inspect its session response format.",
                }

            messages_url = f"{instance_url}/sessions/{session_id}/messages"
            send_response = await client.post(
                messages_url,
                headers=headers,
                json={"message": prompt},
            )
            send_response.raise_for_status()

            history_response = await client.get(
                messages_url,
                headers=headers,
                params={"limit": 50},
            )
            history_response.raise_for_status()
            try:
                history = history_response.json()
            except ValueError:
                history = history_response.text
            try:
                send_result = send_response.json()
            except ValueError:
                send_result = send_response.text

            return {
                "sessionId": session_id,
                "status": "completed",
                "sendResult": send_result,
                "messages": history,
                "citizenReviewRequired": True,
            }
    except httpx.HTTPError as exc:
        raise_lumen_error(exc)
