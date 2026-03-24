import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException

from app import config
from app.observability import log_event
from app.repositories.shipment_repository import shipment_repository
from app.services import google_sheets_service


TRACKING_NUMBER_PATTERN = re.compile(r"\bAB\d{4}\b", re.IGNORECASE)
logger = logging.getLogger(__name__)


def _log_shipment_lookup_started(
    *,
    request_id: Optional[str],
    channel: str,
    customer_phone: str,
    tracking_number: Optional[str],
) -> None:
    log_event(
        logger,
        "shipment_lookup_started",
        requestId=request_id,
        channel=channel,
        phone=customer_phone,
        trackingNumber=tracking_number,
    )


def _log_shipment_lookup_completed(
    *,
    request_id: Optional[str],
    channel: str,
    customer_phone: str,
    shipment: Optional[dict],
    tracking_number: Optional[str],
    recent_shipments: list[dict],
) -> None:
    log_event(
        logger,
        "shipment_lookup_completed",
        requestId=request_id,
        channel=channel,
        phone=customer_phone,
        trackingNumber=(shipment or {}).get("trackingNumber") or tracking_number,
        shipmentFound=bool(shipment),
        shipmentCandidateCount=len(recent_shipments),
    )


def _resolve_shipment(tracking_number: Optional[str], customer_phone: str) -> tuple[Optional[dict], list[dict]]:
    shipment = None
    recent_shipments: list[dict] = []

    if tracking_number:
        shipment = shipment_repository.get_by_tracking_number(tracking_number)

    if not shipment and customer_phone:
        recent_shipments = shipment_repository.get_recent_by_phone(customer_phone)
        if len(recent_shipments) == 1:
            shipment = recent_shipments[0]

    return shipment, recent_shipments


def _resolve_customer_name(
    customer_name: Optional[str],
    shipment: Optional[dict],
    recent_shipments: list[dict],
) -> Optional[str]:
    if customer_name:
        return customer_name

    if shipment:
        return shipment.get("customerName")

    if recent_shipments:
        return recent_shipments[0].get("customerName")

    return None


def _build_customer_payload(customer_name: Optional[str], customer_phone: str) -> dict:
    return {
        "name": customer_name,
        "phone": customer_phone,
    }


def extract_tracking_number(message_text: str) -> Optional[str]:
    match = TRACKING_NUMBER_PATTERN.search(message_text or "")
    if not match:
        return None

    return match.group(0).upper()


def serialize_shipment(shipment: Optional[dict]) -> Optional[dict]:
    if not shipment:
        return None

    return {
        "trackingNumber": shipment.get("trackingNumber"),
        "customerName": shipment.get("customerName"),
        "phone": shipment.get("phone"),
        "status": shipment.get("status"),
        "statusLabel": shipment.get("statusLabel"),
        "estimatedDelivery": shipment.get("estimatedDelivery"),
        "destinationCity": shipment.get("destinationCity"),
    }


def build_chatbot_context(
    channel: str,
    customer_phone: str,
    message_text: str,
    customer_name: Optional[str] = None,
    request_id: Optional[str] = None,
) -> dict:
    tracking_number = extract_tracking_number(message_text)
    _log_shipment_lookup_started(
        request_id=request_id,
        channel=channel,
        customer_phone=customer_phone,
        tracking_number=tracking_number,
    )

    shipment, recent_shipments = _resolve_shipment(tracking_number, customer_phone)
    detected_name = _resolve_customer_name(customer_name, shipment, recent_shipments)

    _log_shipment_lookup_completed(
        request_id=request_id,
        channel=channel,
        customer_phone=customer_phone,
        shipment=shipment,
        tracking_number=tracking_number,
        recent_shipments=recent_shipments,
    )

    return {
        "channel": channel,
        "customer": _build_customer_payload(detected_name, customer_phone),
        "shipment": serialize_shipment(shipment),
        "shipmentCandidates": [serialize_shipment(item) for item in recent_shipments[:3]],
        "userMessage": message_text,
    }


def _build_node_ai_request(context: dict, request_id: Optional[str]) -> Request:
    return Request(
        config.NODE_AI_CHATBOT_URL,
        data=json.dumps(context).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Request-ID": request_id or "",
        },
        method="POST",
    )


def _parse_node_ai_payload(payload: str, request_id: Optional[str]) -> dict:
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as error:
        log_event(
            logger,
            "node_ai_request_failed",
            requestId=request_id,
            error="invalid_json",
        )
        raise HTTPException(status_code=503, detail="Chatbot AI service returned invalid JSON.") from error

    if not data.get("success") or not data.get("reply") or not data.get("intent"):
        log_event(
            logger,
            "node_ai_request_failed",
            requestId=request_id,
            error="incomplete_response",
        )
        raise HTTPException(status_code=503, detail="Chatbot AI service returned an incomplete response.")

    return {
        "reply": data["reply"],
        "intent": data["intent"],
    }


def fetch_chatbot_reply(context: dict, request_id: Optional[str] = None) -> dict:
    log_event(
        logger,
        "node_ai_request_started",
        requestId=request_id,
        channel=context.get("channel"),
        phone=(context.get("customer") or {}).get("phone"),
        trackingNumber=(context.get("shipment") or {}).get("trackingNumber"),
    )
    request = _build_node_ai_request(context, request_id)

    try:
        with urlopen(request, timeout=config.NODE_AI_TIMEOUT_SECONDS) as response:
            payload = response.read().decode("utf-8")
    except HTTPError as error:
        log_event(
            logger,
            "node_ai_request_failed",
            requestId=request_id,
            error=f"HTTP {error.code}",
        )
        raise HTTPException(status_code=503, detail=f"Chatbot AI service returned HTTP {error.code}.") from error
    except (TimeoutError, URLError) as error:
        log_event(
            logger,
            "node_ai_request_failed",
            requestId=request_id,
            error=str(error),
        )
        raise HTTPException(status_code=503, detail="Chatbot AI service is currently unavailable.") from error

    data = _parse_node_ai_payload(payload, request_id)

    log_event(
        logger,
        "node_ai_request_succeeded",
        requestId=request_id,
        intent=data["intent"],
        phone=(context.get("customer") or {}).get("phone"),
        trackingNumber=(context.get("shipment") or {}).get("trackingNumber"),
    )
    return {
        "reply": data["reply"],
        "intent": data["intent"],
    }


def build_chatbot_log_entry(context: dict, ai_result: dict) -> dict:
    shipment = context.get("shipment") or {}
    customer = context.get("customer") or {}

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": context.get("channel"),
        "customerName": customer.get("name"),
        "phone": customer.get("phone"),
        "trackingNumber": shipment.get("trackingNumber"),
        "shipmentStatus": shipment.get("statusLabel") or shipment.get("status"),
        "userMessage": context.get("userMessage"),
        "assistantReply": ai_result.get("reply"),
        "intent": ai_result.get("intent"),
    }


def generate_chatbot_reply(
    channel: str,
    customer_phone: str,
    message_text: str,
    customer_name: Optional[str] = None,
    request_id: Optional[str] = None,
) -> dict:
    log_event(
        logger,
        "chatbot_orchestration_started",
        requestId=request_id,
        channel=channel,
        phone=customer_phone,
        customerName=customer_name,
    )
    context = build_chatbot_context(channel, customer_phone, message_text, customer_name, request_id=request_id)
    ai_result = fetch_chatbot_reply(context, request_id=request_id)
    google_sheets_service.append_chatbot_log_entry(
        build_chatbot_log_entry(context, ai_result),
        request_id=request_id,
    )

    log_event(
        logger,
        "chatbot_orchestration_completed",
        requestId=request_id,
        channel=channel,
        phone=customer_phone,
        trackingNumber=(context.get("shipment") or {}).get("trackingNumber"),
        intent=ai_result.get("intent"),
    )

    return {
        "channel": channel,
        "customer": context["customer"],
        "shipment": context["shipment"],
        "shipmentCandidates": context["shipmentCandidates"],
        "reply": ai_result["reply"],
        "intent": ai_result["intent"],
    }
