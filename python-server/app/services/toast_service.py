import json
import logging
import time
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from app import config
from app.repositories.user_repository import PyMongoError, user_repository


logger = logging.getLogger(__name__)


def fetch_toast_message() -> Optional[str]:
    for attempt in range(1, config.NODE_AI_RETRY_COUNT + 1):
        try:
            with urlopen(config.NODE_AI_URL, timeout=config.NODE_AI_TIMEOUT_SECONDS) as response:
                payload = response.read().decode("utf-8")

            data = json.loads(payload)
            toast_message = (data.get("toastMessage") or "").strip()

            if toast_message:
                return toast_message

            logger.warning("Node AI response did not include toastMessage on attempt %s.", attempt)
        except HTTPError as error:
            logger.warning("Node AI returned HTTP %s on attempt %s.", error.code, attempt)
        except (TimeoutError, URLError) as error:
            logger.warning("Node AI request failed on attempt %s: %s", attempt, error)
        except json.JSONDecodeError as error:
            logger.warning("Node AI returned invalid JSON on attempt %s: %s", attempt, error)

        if attempt < config.NODE_AI_RETRY_COUNT:
            time.sleep(attempt * 0.5)

    return None


def generate_and_store_toast_message(email: str):
    toast_message = fetch_toast_message()

    if not toast_message:
        logger.warning("Toast generation did not produce a message for %s.", email)
        return

    try:
        user_repository.update_toast_message(email, toast_message)
    except PyMongoError:
        logger.exception("Failed to store toast message for %s.", email)
