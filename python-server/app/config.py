import os
from typing import List


def parse_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


def parse_csv_env(name: str, default: str) -> List[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


APP_TITLE = os.getenv("APP_TITLE", "A.B Deliveries Python Server")
ALLOWED_ORIGINS = parse_csv_env(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081",
)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "ab_deliveries")
USERS_COLLECTION_NAME = os.getenv("USERS_COLLECTION_NAME", "users")
REFRESH_SESSIONS_COLLECTION_NAME = os.getenv("REFRESH_SESSIONS_COLLECTION_NAME", "refresh_sessions")

NODE_AI_URL = os.getenv("NODE_AI_URL", "http://127.0.0.1:3001/toast-message")
NODE_AI_TIMEOUT_SECONDS = float(os.getenv("NODE_AI_TIMEOUT_SECONDS", "20"))
NODE_AI_RETRY_COUNT = int(os.getenv("NODE_AI_RETRY_COUNT", "2"))

JWT_ACCESS_TOKEN_SECRET = os.getenv("JWT_ACCESS_TOKEN_SECRET", "local-dev-access-token-secret-change-me")
JWT_ISSUER = os.getenv("JWT_ISSUER", "ab-deliveries-python")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "ab-deliveries-clients")
AUTH_ACCESS_TOKEN_TTL_SECONDS = int(os.getenv("AUTH_ACCESS_TOKEN_TTL_SECONDS", "900"))
AUTH_REFRESH_TOKEN_TTL_SECONDS = int(os.getenv("AUTH_REFRESH_TOKEN_TTL_SECONDS", "2592000"))
STREAM_TOKEN_SECRET = os.getenv("STREAM_TOKEN_SECRET", JWT_ACCESS_TOKEN_SECRET)
STREAM_TOKEN_TTL_SECONDS = int(os.getenv("STREAM_TOKEN_TTL_SECONDS", "60"))
ACCESS_TOKEN_REQUIRE_ACTIVE_SESSION = parse_bool_env("ACCESS_TOKEN_REQUIRE_ACTIVE_SESSION", False)

REFRESH_COOKIE_NAME = os.getenv("REFRESH_COOKIE_NAME", "ab_refresh")
REFRESH_COOKIE_SECURE = parse_bool_env("REFRESH_COOKIE_SECURE", False)
REFRESH_COOKIE_SAMESITE = os.getenv("REFRESH_COOKIE_SAMESITE", "lax").lower()
STREAM_COOKIE_NAME = os.getenv("STREAM_COOKIE_NAME", "ab_stream")
STREAM_COOKIE_SECURE = parse_bool_env("STREAM_COOKIE_SECURE", REFRESH_COOKIE_SECURE)
STREAM_COOKIE_SAMESITE = os.getenv("STREAM_COOKIE_SAMESITE", REFRESH_COOKIE_SAMESITE).lower()
