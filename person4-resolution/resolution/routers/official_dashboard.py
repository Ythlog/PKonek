"""Department-scoped official dashboard reusing admin analytics aggregates."""
from fastapi import APIRouter, Depends, HTTPException
from ..db import engine
from ..repositories.admin_analytics import grouped_counts, overview
from ..repositories.admin_performance import response_time_stats, verification_rates
from ..schemas.admin_analytics import AdminOverview
from ..security import CurrentUser, get_current_user

router=APIRouter(tags=["official-dashboard"])


@router.get("/official/dashboard")
def get_official_dashboard(user:CurrentUser=Depends(get_current_user)):
    if user.role!="official":
        raise HTTPException(403,{"detail":"Official role required","code":"FORBIDDEN_ROLE"})
    if user.department_id is None:
        raise HTTPException(403,{"detail":"Official has no department","code":"MISSING_DEPARTMENT"})
    try:
        department_id=user.department_id
        with engine.connect() as connection:
            cards=overview(connection,department_id)
            counts={"by_status":grouped_counts(connection,"status",department_id),
                    "by_category":grouped_counts(connection,"category",department_id),
                    "by_severity":grouped_counts(connection,"severity",department_id)}
            performance={"per_official":verification_rates(connection,"official",department_id),
                         "per_department":verification_rates(connection,"department",department_id),
                         "response_time":response_time_stats(connection,department_id)}
        return {"cards":cards,**counts,**performance}
    except Exception as exc:
        raise HTTPException(503,{"detail":"Official dashboard unavailable","code":"DASHBOARD_UNAVAILABLE"}) from exc
