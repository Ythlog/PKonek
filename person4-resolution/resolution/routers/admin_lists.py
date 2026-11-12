"""Pasig admin trends, red escalation list, and unassigned list endpoints."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from ..db import engine
from ..repositories.admin_lists import daily_trends, escalation_list, unassigned_list
from ..schemas.admin_lists import AdminComplaintPage, DailyTrend
from ..security import CurrentUser, get_current_user

router=APIRouter(tags=["admin-lists"])


def _admin(user: CurrentUser):
    if user.role!="pasig_admin":
        raise HTTPException(403,{"detail":"Pasig admin role required","code":"FORBIDDEN_ROLE"})


@router.get("/admin/trends/daily",response_model=list[DailyTrend])
def get_daily_trends(from_date:date,to_date:date,user:CurrentUser=Depends(get_current_user)):
    _admin(user)
    if to_date<from_date or (to_date-from_date).days>365:
        raise HTTPException(422,{"detail":"Invalid date range","code":"INVALID_DATE_RANGE"})
    try:
        with engine.connect() as connection: return daily_trends(connection,from_date,to_date)
    except Exception as exc:
        raise HTTPException(503,{"detail":"Daily trends unavailable","code":"ANALYTICS_UNAVAILABLE"}) from exc


def _page(fetch,page,page_size):
    try:
        with engine.connect() as connection: items,total=fetch(connection,page,page_size)
        return {"items":items,"total":total,"page":page,"page_size":page_size}
    except Exception as exc:
        raise HTTPException(503,{"detail":"Admin complaint list unavailable","code":"ANALYTICS_UNAVAILABLE"}) from exc


@router.get("/admin/escalations",response_model=AdminComplaintPage)
def get_escalations(page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100),user:CurrentUser=Depends(get_current_user)):
    _admin(user); return _page(escalation_list,page,page_size)


@router.get("/admin/unassigned",response_model=AdminComplaintPage)
def get_unassigned(page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100),user:CurrentUser=Depends(get_current_user)):
    _admin(user); return _page(unassigned_list,page,page_size)
