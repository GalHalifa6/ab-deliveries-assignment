import logging

from app.observability import log_event


logger = logging.getLogger(__name__)


def record_client_telemetry(payload: dict, request_id: str | None = None) -> dict:
    event = payload.get("event") or "client_event"

    log_event(
        logger,
        event,
        requestId=request_id,
        source="client",
        client=payload.get("client"),
        platform=payload.get("platform"),
        mode=payload.get("mode"),
        endpoint=payload.get("endpoint"),
        success=payload.get("success"),
        email=payload.get("email"),
        phone=payload.get("phone"),
        detail=payload.get("detail"),
    )

    return {"success": True, "event": event}
