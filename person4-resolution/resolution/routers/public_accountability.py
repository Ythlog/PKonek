"""Unauthenticated public accountability board."""
from fastapi import APIRouter, HTTPException, Response
from ..db import engine
from ..repositories.public_accountability import department_board
from ..schemas.public_accountability import DepartmentAccountability

router=APIRouter(tags=["public-accountability"])


@router.get("/public/accountability/departments",response_model=list[DepartmentAccountability])
def get_public_department_board(response:Response):
    try:
        with engine.connect() as connection:
            items=department_board(connection)
        response.headers["Cache-Control"]="max-age=60"
        return items
    except Exception as exc:
        raise HTTPException(503,{"detail":"Public accountability data unavailable","code":"ACCOUNTABILITY_UNAVAILABLE"}) from exc
