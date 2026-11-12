"""Standalone app for local testing of this module only.

Run from lumen/modules/accounts_complaints:
    ..\\..\\apps\\api\\.venv\\Scripts\\python.exe -m uvicorn accounts_complaints.standalone_main:app --reload --port 8001
"""
from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import router
from .db import get_db

app = FastAPI(title="Lumen: Accounts and Complaint Records (standalone)")
app.include_router(router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.get("/health/db", tags=["health"])
def health_db(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
