from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.services import client_telemetry_service


router = APIRouter(prefix="/telemetry", tags=["telemetry"])


class ClientTelemetryRequest(BaseModel):
    event: str
    client: str
    platform: Optional[str] = None
    mode: Optional[str] = None
    endpoint: Optional[str] = None
    success: Optional[bool] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    detail: Optional[str] = None


@router.post("/client")
def create_client_telemetry(payload: ClientTelemetryRequest, request: Request):
    return client_telemetry_service.record_client_telemetry(
        payload.model_dump(),
        request_id=request.state.request_id,
    )
