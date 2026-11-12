"""Official/admin complaint queue endpoint."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import engine
from ..repositories.queue import queue_page
from ..schemas.queue import QueuePage
from ..security import CurrentUser, get_current_user

router = APIRouter(tags=["queue"])


@router.get("/official/queue", response_model=QueuePage)
def get_queue(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
              status: str | None = None, category_id: int | None = Query(None, ge=1),
              severity: Literal["critical","high","medium","low"] | None = None,
              overdue: bool | None = None, assigned_to_me: bool = False,
              user: CurrentUser = Depends(get_current_user)):
    if user.role not in {"official", "pasig_admin"}:
        raise HTTPException(403, {"detail":"Officials and admins only","code":"FORBIDDEN_ROLE"})
    if user.role == "official" and user.department_id is None:
        raise HTTPException(403, {"detail":"Official has no department","code":"MISSING_DEPARTMENT"})
    try:
        with engine.connect() as connection:
            items,total=queue_page(connection,user_id=user.id,department_id=user.department_id,
                is_admin=user.role=="pasig_admin",page=page,page_size=page_size,status_code=status,
                category_id=category_id,severity=severity,overdue=overdue,assigned_to_me=assigned_to_me)
        return {"items":items,"total":total,"page":page,"page_size":page_size}
    except Exception as exc:
        raise HTTPException(503,{"detail":"Queue is unavailable","code":"QUEUE_UNAVAILABLE"}) from exc
