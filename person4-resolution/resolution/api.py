"""FastAPI integration points. Scheduler lifecycle is explicit and side-effect free on import."""

from fastapi import APIRouter, FastAPI
from .config import get_settings
from .routers.notifications import router as notifications_router
from .routers.responses import router as responses_router
from .routers.timeline import router as timeline_router
from .routers.assignment import router as assignment_router
from .routers.queue import router as queue_router
from .routers.status_change import router as status_change_router
from .routers.verification import router as verification_router
from .routers.admin_analytics import router as admin_analytics_router
from . import scheduler as sla_scheduler

router = APIRouter()
router.include_router(notifications_router, prefix=get_settings().api_prefix)
router.include_router(responses_router, prefix=get_settings().api_prefix)
router.include_router(timeline_router, prefix=get_settings().api_prefix)
router.include_router(assignment_router, prefix=get_settings().api_prefix)
router.include_router(queue_router, prefix=get_settings().api_prefix)
router.include_router(status_change_router, prefix=get_settings().api_prefix)
router.include_router(verification_router, prefix=get_settings().api_prefix)
router.include_router(admin_analytics_router, prefix=get_settings().api_prefix)


def register(app: FastAPI) -> None:
    app.include_router(router)


def start_scheduler() -> None:
    sla_scheduler.start_scheduler()


def stop_scheduler() -> None:
    sla_scheduler.stop_scheduler()

