"""Pasig admin verification and response-time performance endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from ..db import engine
from ..repositories.admin_performance import response_time_stats, verification_rates
from ..schemas.admin_performance import AdminPerformance
from ..security import CurrentUser, get_current_user

router=APIRouter(tags=["admin-performance"])


@router.get("/admin/performance",response_model=AdminPerformance)
def get_admin_performance(user:CurrentUser=Depends(get_current_user)):
    if user.role!="pasig_admin":
        raise HTTPException(403,{"detail":"Pasig admin role required","code":"FORBIDDEN_ROLE"})
    try:
        with engine.connect() as connection:
            return {"per_official":verification_rates(connection,"official"),
                    "per_department":verification_rates(connection,"department"),
                    "response_time":response_time_stats(connection)}
    except Exception as exc:
        raise HTTPException(503,{"detail":"Performance metrics unavailable","code":"METRICS_UNAVAILABLE"}) from exc
