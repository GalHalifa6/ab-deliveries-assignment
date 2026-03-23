import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PYTHON_SERVER_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = PYTHON_SERVER_ROOT / "google-sheets-verify.json"


def load_dotenv(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_dotenv(PYTHON_SERVER_ROOT / ".env")
sys.path.insert(0, str(PYTHON_SERVER_ROOT))

from app.services.google_sheets_service import append_chatbot_log_entry  # noqa: E402
from google.oauth2.service_account import Credentials  # noqa: E402
from googleapiclient.discovery import build  # noqa: E402


def main() -> int:
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": "local-test",
        "customerName": "גל חליפה",
        "phone": "+972501234567",
        "trackingNumber": "AB1001",
        "shipmentStatus": "בדרך למסירה",
        "userMessage": "בדיקת כתיבה בעברית לגוגל שיטס",
        "assistantReply": "הכתיבה בעברית הצליחה",
        "intent": "tracking",
    }

    written = append_chatbot_log_entry(entry)

    scope = ["https://www.googleapis.com/auth/spreadsheets"]
    credentials = Credentials.from_service_account_file(
        os.environ["GOOGLE_SERVICE_ACCOUNT_FILE"],
        scopes=scope,
    )
    service = build("sheets", "v4", credentials=credentials, cache_discovery=False)
    rows = (
        service.spreadsheets()
        .values()
        .get(
            spreadsheetId=os.environ["GOOGLE_SHEETS_SPREADSHEET_ID"],
            range=f"{os.environ['GOOGLE_SHEETS_SHEET_NAME']}!A1:I10",
        )
        .execute()
        .get("values", [])
    )

    result = {
        "written": written,
        "entry": entry,
        "rows": rows,
    }
    OUTPUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(str(OUTPUT_PATH))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
