from fastapi import APIRouter

from app.db import ping_database


router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "python-server",
        "databaseStatus": ping_database(),
    }
