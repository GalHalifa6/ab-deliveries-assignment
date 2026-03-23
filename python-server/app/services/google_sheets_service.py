import base64
import json
import logging
from functools import lru_cache

from app import config


logger = logging.getLogger(__name__)
GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"


def is_google_sheets_logging_enabled() -> bool:
    return bool(
        config.GOOGLE_SHEETS_LOGGING_ENABLED
        and config.GOOGLE_SHEETS_SPREADSHEET_ID
        and (
            config.GOOGLE_SERVICE_ACCOUNT_JSON
            or config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
            or config.GOOGLE_SERVICE_ACCOUNT_FILE
        )
    )


@lru_cache(maxsize=1)
def get_sheets_service():
    if not is_google_sheets_logging_enabled():
        raise RuntimeError("Google Sheets logging is not configured.")

    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build

    if config.GOOGLE_SERVICE_ACCOUNT_JSON:
        credentials_info = json.loads(config.GOOGLE_SERVICE_ACCOUNT_JSON)
        credentials = Credentials.from_service_account_info(credentials_info, scopes=[GOOGLE_SHEETS_SCOPE])
    elif config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64:
        decoded_json = base64.b64decode(config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64).decode("utf-8")
        credentials_info = json.loads(decoded_json)
        credentials = Credentials.from_service_account_info(credentials_info, scopes=[GOOGLE_SHEETS_SCOPE])
    else:
        credentials = Credentials.from_service_account_file(
            config.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes=[GOOGLE_SHEETS_SCOPE],
        )

    return build("sheets", "v4", credentials=credentials, cache_discovery=False)


def append_chatbot_log_entry(entry: dict) -> bool:
    if not is_google_sheets_logging_enabled():
        return False

    values = [[
        entry.get("timestamp"),
        entry.get("channel"),
        entry.get("customerName"),
        entry.get("phone"),
        entry.get("trackingNumber"),
        entry.get("shipmentStatus"),
        entry.get("userMessage"),
        entry.get("assistantReply"),
        entry.get("intent"),
    ]]

    try:
        (
            get_sheets_service()
            .spreadsheets()
            .values()
            .append(
                spreadsheetId=config.GOOGLE_SHEETS_SPREADSHEET_ID,
                range=f"{config.GOOGLE_SHEETS_SHEET_NAME}!A:I",
                valueInputOption="RAW",
                insertDataOption="INSERT_ROWS",
                body={"values": values},
            )
            .execute()
        )
    except Exception as error:  # pragma: no cover - defensive around external SDK/network
        logger.warning("Google Sheets logging failed: %s", error)
        return False

    return True
