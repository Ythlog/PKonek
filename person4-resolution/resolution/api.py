"""FastAPI integration points. Scheduler lifecycle is explicit and side-effect free on import."""

from fastapi import APIRouter, FastAPI

router = APIRouter()


def register(app: FastAPI) -> None:
    app.include_router(router)


def start_scheduler() -> None:
    """Scheduler registration will be added with the SLA service."""


def stop_scheduler() -> None:
    """Scheduler shutdown will be added with the SLA service."""

