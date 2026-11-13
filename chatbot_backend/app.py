"""Lumen AI chat adapter for citizen complaint-writing assistance."""

from __future__ import annotations

from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any
from urllib.parse import quote

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


class ChatSessionCreate(BaseModel):
    title: str = Field(default="PKonek complaint help", min_length=1, max_length=120)


class ChatMessageRequest(BaseModel):
    session_token: str = Field(min_length=20, max_length=4000)
    message: str = Field(min_length=1, max_length=5000)


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


def citizen_claims(authorization: str | None) -> dict[str, Any]:
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
    return claims


def session_identifier(payload: Any) -> str | None:
    """Accept common Lumen envelope and casing variants for session IDs."""
    if not isinstance(payload, dict):
        return None
    normalized = {str(key).lower(): value for key, value in payload.items()}
    for key in ("id", "session_id", "sessionid"):
        value = normalized.get(key)
        if value is not None:
            return str(value)
    for key in ("data", "session", "result"):
        found = session_identifier(normalized.get(key))
        if found:
            return found
    return None


def conversation_messages(payload: Any) -> list[dict[str, str]]:
    """Reduce Lumen's message history to safe, displayable role/text pairs."""
    if isinstance(payload, list):
        output: list[dict[str, str]] = []
        for item in payload:
            output.extend(conversation_messages(item))
        return output
    if not isinstance(payload, dict):
        return []

    fields = {str(key).lower(): value for key, value in payload.items()}
    role_value = next((fields[key] for key in ("role", "sender", "sender_type", "author", "speaker", "message_type", "type") if key in fields), "")
    role_text = str(role_value).lower()
    is_user = fields.get("is_user") is True or fields.get("from_user") is True
    is_assistant = fields.get("is_bot") is True or fields.get("is_assistant") is True
    role = "user" if is_user or any(term in role_text for term in ("user", "human", "citizen")) else "assistant"
    if is_assistant:
        role = "assistant"
    content = next((fields[key] for key in ("content", "text", "message", "response", "answer", "output") if key in fields), None)
    if isinstance(content, str) and content.strip():
        return [{"role": role, "content": content.strip()}]
    if isinstance(content, list):
        parts = [
            part.get("text", "").strip()
            for part in content
            if isinstance(part, dict) and isinstance(part.get("text"), str) and part.get("text").strip()
        ]
        if parts:
            return [{"role": role, "content": "\n".join(parts)}]
    if isinstance(content, dict):
        nested = conversation_messages(content)
        if nested:
            return nested
    output: list[dict[str, str]] = []
    for key in ("data", "messages", "items", "results", "history", "conversation", "choices"):
        if key in fields:
            output.extend(conversation_messages(fields[key]))
    return output


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


@app.post("/sessions")
async def create_chat_session(
    body: ChatSessionCreate,
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, str]:
    """Start a citizen-owned Lumen session and return a signed opaque session token."""
    claims = citizen_claims(authorization)
    if not settings.LUMEN_CHAT_INSTANCE_ID:
        raise HTTPException(status_code=503, detail="LUMEN_CHAT_INSTANCE_ID is not configured")
    url = f"{settings.LUMEN_API_BASE_URL.rstrip('/')}/ai_chat/instances/{settings.LUMEN_CHAT_INSTANCE_ID}/sessions"
    try:
        async with httpx.AsyncClient(timeout=settings.LUMEN_CHAT_TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=lumen_headers(), json={"title": body.title})
            response.raise_for_status()
            try:
                session_data = response.json()
            except ValueError as exc:
                raise HTTPException(status_code=502, detail="Lumen returned an unreadable session response") from exc
            lumen_session_id = session_identifier(session_data)
            if not lumen_session_id:
                raise HTTPException(status_code=502, detail="Lumen's session response did not include a session ID")
    except httpx.HTTPError as exc:
        raise_lumen_error(exc)

    session_token = jwt.encode(
        {
            "sub": str(claims["sub"]),
            "role": "citizen",
            "chat_session": lumen_session_id,
            "exp": datetime.now(timezone.utc) + timedelta(hours=4),
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    return {"session_token": session_token}


@app.post("/messages")
async def send_chat_message(
    body: ChatMessageRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Send a follow-up in the caller's existing session and return readable history."""
    claims = citizen_claims(authorization)
    try:
        session_claims = jwt.decode(
            body.session_token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["sub", "role", "chat_session", "exp"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Chat session expired. Start a new conversation.") from exc
    if session_claims.get("role") != "citizen" or str(session_claims.get("sub")) != str(claims.get("sub")):
        raise HTTPException(status_code=403, detail="This chat session belongs to another account")
    if not settings.LUMEN_CHAT_INSTANCE_ID:
        raise HTTPException(status_code=503, detail="LUMEN_CHAT_INSTANCE_ID is not configured")

    lumen_session_id = str(session_claims["chat_session"])
    instance_url = f"{settings.LUMEN_API_BASE_URL.rstrip('/')}/ai_chat/instances/{settings.LUMEN_CHAT_INSTANCE_ID}"
    messages_url = f"{instance_url}/sessions/{quote(lumen_session_id, safe='')}/messages"
    headers = lumen_headers()
    try:
        async with httpx.AsyncClient(timeout=settings.LUMEN_CHAT_TIMEOUT_SECONDS) as client:
            sent = await client.post(messages_url, headers=headers, json={"message": body.message.strip()})
            sent.raise_for_status()
            history_response = await client.get(messages_url, headers=headers, params={"limit": 50})
            history_response.raise_for_status()
            try:
                history_payload = history_response.json()
            except ValueError:
                history_payload = history_response.text
            try:
                sent_payload = sent.json()
            except ValueError:
                sent_payload = sent.text
    except httpx.HTTPError as exc:
        raise_lumen_error(exc)

    messages = conversation_messages(history_payload)
    if not messages:
        messages = conversation_messages(sent_payload)
    if not messages:
        raise HTTPException(status_code=502, detail="Lumen returned no readable chat messages")
    return {"messages": messages}


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
            try:
                session_data = session_response.json()
            except ValueError as exc:
                raise HTTPException(status_code=502, detail="Lumen returned an unreadable session response") from exc
            if not isinstance(session_data, dict):
                raise HTTPException(status_code=502, detail="Lumen returned an unexpected session response")

            session_record = session_data.get("data", session_data)
            if isinstance(session_record, dict):
                session_record = session_record.get("session", session_record)
            session_id = (
                session_record.get("id") or session_record.get("session_id")
                if isinstance(session_record, dict)
                else None
            )
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
