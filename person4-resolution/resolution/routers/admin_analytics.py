"""Pasig admin overview analytics endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from ..db import engine
from ..repositories.admin_analytics import grouped_counts, overview
from ..schemas.admin_analytics import AdminOverview
from ..security import CurrentUser, get_current_user

router=APIRouter(tags=["admin-analytics"])


@router.get("/admin/overview",response_model=AdminOverview)
def get_admin_overview(user:CurrentUser=Depends(get_current_user)):
    if user.role!="pasig_admin":
        raise HTTPException(403,{"detail":"Pasig admin role required","code":"FORBIDDEN_ROLE"})
    try:
        with engine.connect() as connection:
            return {"cards":overview(connection),"by_status":grouped_counts(connection,"status"),
                    "by_category":grouped_counts(connection,"category"),"by_severity":grouped_counts(connection,"severity")}
    except Exception as exc:
        raise HTTPException(503,{"detail":"Admin analytics unavailable","code":"ANALYTICS_UNAVAILABLE"}) from exc
