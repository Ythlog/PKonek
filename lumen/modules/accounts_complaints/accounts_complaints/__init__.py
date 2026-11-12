"""Lumen accounts and complaint records module.

Not wired into apps/api yet. To mount later in apps/api/app/main.py:

    from accounts_complaints import router as accounts_complaints_router
    app.include_router(accounts_complaints_router)
"""
from fastapi import APIRouter

from .routers import auth, categories, complaints, logs, users

router = APIRouter()
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(logs.router)
router.include_router(categories.router)
router.include_router(complaints.router)

__all__ = ["router"]
