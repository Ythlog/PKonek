"""FastAPI integration points. Scheduler lifecycle is explicit and side-effect free on import."""

from fastapi import APIRouter, FastAPI
from .config import get_settings
from .routers.notifications import router as notifications_router
from .routers.responses import router as responses_router

router = APIRouter()
router.include_router(notifications_router, prefix=get_settings().api_prefix)
router.include_router(responses_router, prefix=get_settings().api_prefix)


def register(app: FastAPI) -> None:
    app.include_router(router)


def start_scheduler() -> None:
    """Scheduler registration will be added with the SLA service."""


def stop_scheduler() -> None:
    """Scheduler shutdown will be added with the SLA service."""

