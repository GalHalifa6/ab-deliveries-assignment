import json
import logging
from typing import Any
from uuid import uuid4


def build_request_id() -> str:
    return uuid4().hex


def normalize_log_fields(**fields: Any) -> dict[str, Any]:
    normalized = {}

    for key, value in fields.items():
        if value is None:
            continue

        normalized[key] = value

    return normalized


def log_event(logger: logging.Logger, event: str, **fields: Any) -> None:
    payload = {"event": event, **normalize_log_fields(**fields)}
    logger.info(json.dumps(payload, ensure_ascii=False, default=str))
