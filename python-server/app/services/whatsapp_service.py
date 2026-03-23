import base64
import hashlib
import hmac
from urllib.parse import parse_qsl
from xml.sax.saxutils import escape

from fastapi import HTTPException

from app import config
from app.services import chatbot_service


def normalize_whatsapp_phone(from_number: str) -> str:
    prefix = "whatsapp:"
    if from_number.lower().startswith(prefix):
        return from_number[len(prefix):].strip()

    return from_number.strip()


def build_twiml_response(message_text: str) -> str:
    escaped_message = escape(message_text or "")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f"<Response><Message>{escaped_message}</Message></Response>"
    )


def build_twilio_signature(url: str, form_fields: dict[str, str]) -> str:
    pieces = [url]
    for key in sorted(form_fields):
        pieces.append(key)
        pieces.append(form_fields[key] or "")

    digest = hmac.new(
        config.TWILIO_AUTH_TOKEN.encode("utf-8"),
        "".join(pieces).encode("utf-8"),
        hashlib.sha1,
    ).digest()
    return base64.b64encode(digest).decode("utf-8")


def validate_twilio_request_signature(url: str, form_fields: dict[str, str], signature: str | None) -> None:
    if not config.TWILIO_VALIDATE_SIGNATURE:
        return

    if not config.TWILIO_AUTH_TOKEN:
        raise HTTPException(status_code=500, detail="Twilio signature validation is enabled but not configured.")

    if not signature:
        raise HTTPException(status_code=403, detail="Missing Twilio signature.")

    expected_signature = build_twilio_signature(url, form_fields)
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature.")


def build_webhook_url(request_url: str) -> str:
    return config.TWILIO_WHATSAPP_WEBHOOK_URL or request_url


def extract_whatsapp_form_fields(raw_body: bytes) -> dict[str, str]:
    parsed_pairs = parse_qsl(raw_body.decode("utf-8"), keep_blank_values=True)
    return {key: value for key, value in parsed_pairs}


def handle_incoming_whatsapp_message(from_number: str, message_text: str, profile_name: str | None = None) -> dict:
    normalized_phone = normalize_whatsapp_phone(from_number)
    result = chatbot_service.generate_chatbot_reply(
        channel="whatsapp",
        customer_phone=normalized_phone,
        message_text=message_text,
        customer_name=profile_name,
    )

    return {
        "reply": result["reply"],
        "twiml": build_twiml_response(result["reply"]),
        "result": result,
    }
