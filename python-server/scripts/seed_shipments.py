import json
import os
import sys
from pathlib import Path


def load_dotenv(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PYTHON_SERVER_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(PYTHON_SERVER_ROOT / ".env")

sys.path.insert(0, str(PYTHON_SERVER_ROOT))

from app.db import ensure_indexes, shipments_collection  # noqa: E402


def main() -> int:
    seed_path = PROJECT_ROOT / "chatbot" / "sample_shipments.json"

    if not seed_path.exists():
        print(f"Seed file not found: {seed_path}")
        return 1

    shipments = json.loads(seed_path.read_text(encoding="utf-8"))
    ensure_indexes()

    inserted_or_updated = 0
    for shipment in shipments:
        tracking_number = shipment.get("trackingNumber")
        if not tracking_number:
            print("Skipping shipment without trackingNumber.")
            continue

        shipments_collection.replace_one(
            {"trackingNumber": tracking_number},
            shipment,
            upsert=True,
        )
        inserted_or_updated += 1

    print(f"Seeded {inserted_or_updated} shipment records into '{shipments_collection.name}'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
