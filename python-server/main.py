import base64
import asyncio
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from typing import List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

import certifi
from fastapi import BackgroundTasks, Cookie, Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError, ServerSelectionTimeoutError
from passlib.context import CryptContext


class RegistrationRequest(BaseModel):
    fullName: str
    phone: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


app = FastAPI(title="A.B Deliveries Python Server")
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
logger = logging.getLogger(__name__)


def parse_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


def get_allowed_origins() -> List[str]:
    configured_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081",
    )
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
mongodb_name = os.getenv("MONGODB_DB_NAME", "ab_deliveries")
users_collection_name = os.getenv("USERS_COLLECTION_NAME", "users")
sessions_collection_name = os.getenv("SESSIONS_COLLECTION_NAME", "sessions")
node_ai_url = os.getenv("NODE_AI_URL", "http://127.0.0.1:3001/toast-message")
node_ai_timeout_seconds = float(os.getenv("NODE_AI_TIMEOUT_SECONDS", "20"))
node_ai_retry_count = int(os.getenv("NODE_AI_RETRY_COUNT", "2"))
auth_token_secret = os.getenv("AUTH_TOKEN_SECRET", "local-dev-auth-token-secret-change-me")
auth_access_token_ttl_seconds = int(os.getenv("AUTH_ACCESS_TOKEN_TTL_SECONDS", "1800"))
session_cookie_name = os.getenv("SESSION_COOKIE_NAME", "ab_session")
session_cookie_secure = parse_bool_env("SESSION_COOKIE_SECURE", False)
session_cookie_samesite = os.getenv("SESSION_COOKIE_SAMESITE", "lax").lower()
session_cookie_ttl_seconds = int(os.getenv("SESSION_COOKIE_TTL_SECONDS", "604800"))

mongodb_client_options = {
    "serverSelectionTimeoutMS": 5000,
}

if mongodb_uri.startswith("mongodb+srv://"):
    mongodb_client_options["tlsCAFile"] = certifi.where()

client = MongoClient(mongodb_uri, **mongodb_client_options)
database = client[mongodb_name]
users_collection = database[users_collection_name]
sessions_collection = database[sessions_collection_name]


def ensure_indexes():
    try:
        if hasattr(users_collection, "create_index"):
            users_collection.create_index("email", unique=True)

        if hasattr(sessions_collection, "create_index"):
            sessions_collection.create_index("sessionId", unique=True)
            sessions_collection.create_index("expiresAt")
    except (PyMongoError, ServerSelectionTimeoutError) as error:
        logger.warning("Skipping MongoDB index creation during startup: %s", error)


ensure_indexes()


def base64url_encode(raw_value: bytes) -> str:
    return base64.urlsafe_b64encode(raw_value).rstrip(b"=").decode("ascii")


def base64url_decode(raw_value: str) -> bytes:
    padding = "=" * (-len(raw_value) % 4)
    return base64.urlsafe_b64decode(f"{raw_value}{padding}")


def sign_value(raw_value: str, secret: str) -> str:
    signature = hmac.new(secret.encode("utf-8"), raw_value.encode("utf-8"), hashlib.sha256).digest()
    return base64url_encode(signature)


def encode_access_token(email: str) -> str:
    payload = {
        "sub": email.lower(),
        "type": "access",
        "exp": int(time.time()) + auth_access_token_ttl_seconds,
    }
    payload_segment = base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature_segment = sign_value(payload_segment, auth_token_secret)
    return f"{payload_segment}.{signature_segment}"


def decode_access_token(token: str) -> dict:
    try:
        payload_segment, signature_segment = token.split(".", 1)
    except ValueError as error:
        raise HTTPException(status_code=401, detail="Invalid authentication token.") from error

    expected_signature = sign_value(payload_segment, auth_token_secret)

    if not hmac.compare_digest(signature_segment, expected_signature):
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

    try:
        payload = json.loads(base64url_decode(payload_segment).decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=401, detail="Invalid authentication token.") from error

    if payload.get("type") != "access" or payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=401, detail="Authentication token has expired.")

    return payload


def set_session_cookie(response: Response, session_id: str):
    response.set_cookie(
        key=session_cookie_name,
        value=session_id,
        httponly=True,
        secure=session_cookie_secure,
        samesite=session_cookie_samesite,
        max_age=session_cookie_ttl_seconds,
        path="/",
    )


def clear_session_cookie(response: Response):
    response.delete_cookie(
        key=session_cookie_name,
        httponly=True,
        secure=session_cookie_secure,
        samesite=session_cookie_samesite,
        path="/",
    )


def create_session(email: str) -> str:
    session_id = secrets.token_urlsafe(32)
    now = int(time.time())

    sessions_collection.insert_one(
        {
            "sessionId": session_id,
            "email": email.lower(),
            "createdAt": now,
            "expiresAt": now + session_cookie_ttl_seconds,
        }
    )

    return session_id


def delete_session(session_id: str):
    if hasattr(sessions_collection, "delete_one"):
        sessions_collection.delete_one({"sessionId": session_id})


def get_session(session_id: str) -> Optional[dict]:
    session = sessions_collection.find_one({"sessionId": session_id})

    if not session:
        return None

    if session.get("expiresAt", 0) < int(time.time()):
        delete_session(session_id)
        return None

    return session


def get_user_by_email(email: str) -> Optional[dict]:
    return users_collection.find_one({"email": email.lower()})


def get_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        return None

    return token


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    session_id: Optional[str] = Cookie(default=None, alias=session_cookie_name),
):
    bearer_token = get_bearer_token(authorization)

    if bearer_token:
        token_payload = decode_access_token(bearer_token)
        user = get_user_by_email(token_payload["sub"])

        if not user:
            raise HTTPException(status_code=401, detail="Authenticated user was not found.")

        return user

    if session_id:
        session = get_session(session_id)

        if not session:
            raise HTTPException(status_code=401, detail="Session is invalid or has expired.")

        user = get_user_by_email(session["email"])

        if not user:
            raise HTTPException(status_code=401, detail="Authenticated user was not found.")

        return user

    raise HTTPException(status_code=401, detail="Authentication is required.")


def resolve_client_type(x_client_type: Optional[str]) -> str:
    if (x_client_type or "").strip().lower() == "mobile":
        return "mobile"

    return "web"


def build_user_response(user: dict) -> dict:
    return {
        "fullName": user["fullName"],
        "phone": user["phone"],
        "email": user["email"],
    }


def build_auth_response(email: str, client_type: str) -> dict:
    if client_type == "mobile":
        return {
            "clientType": "mobile",
            "accessToken": encode_access_token(email),
        }

    return {
        "clientType": "web",
        "sessionCookie": True,
    }


def fetch_toast_message() -> Optional[str]:
    for attempt in range(1, node_ai_retry_count + 1):
        try:
            with urlopen(node_ai_url, timeout=node_ai_timeout_seconds) as response:
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

        if attempt < node_ai_retry_count:
            time.sleep(attempt * 0.5)

    return None


def generate_and_store_toast_message(email: str):
    toast_message = fetch_toast_message()

    if not toast_message:
        logger.warning("Toast generation did not produce a message for %s.", email)
        return

    users_collection.update_one(
        {"email": email.lower()},
        {"$set": {"toastMessage": toast_message}},
    )


@app.get("/health")
def health_check():
    database_status = "ok"

    try:
        client.admin.command("ping")
    except ServerSelectionTimeoutError:
        database_status = "unreachable"

    return {
        "status": "ok",
        "service": "python-server",
        "nodeAiUrl": node_ai_url,
        "nodeAiTimeoutSeconds": node_ai_timeout_seconds,
        "nodeAiRetryCount": node_ai_retry_count,
        "database": mongodb_name,
        "usersCollection": users_collection_name,
        "sessionsCollection": sessions_collection_name,
        "databaseStatus": database_status,
        "sessionCookieName": session_cookie_name,
        "sessionCookieSecure": session_cookie_secure,
        "accessTokenTtlSeconds": auth_access_token_ttl_seconds,
    }


@app.post("/register")
def register(
    payload: RegistrationRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    x_client_type: Optional[str] = Header(default=None),
):
    logger.info("Registration request received for email: %s", payload.email)

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    try:
        existing_user = get_user_by_email(payload.email)
    except ServerSelectionTimeoutError as error:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.") from error

    if existing_user:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    hashed_password = pwd_context.hash(payload.password)
    email = payload.email.lower()

    user_document = {
        "fullName": payload.fullName.strip(),
        "phone": payload.phone.strip(),
        "email": email,
        "passwordHash": hashed_password,
        "toastMessage": None,
        "createdAt": int(time.time()),
    }

    try:
        users_collection.insert_one(user_document)
    except DuplicateKeyError as error:
        raise HTTPException(status_code=409, detail="A user with this email already exists.") from error
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail="Database error while saving the user.") from error

    background_tasks.add_task(generate_and_store_toast_message, email)

    client_type = resolve_client_type(x_client_type)

    if client_type == "web":
        set_session_cookie(response, create_session(email))

    return {
        "success": True,
        "message": f"Welcome aboard, {payload.fullName}! Your registration was saved.",
        "toastPending": True,
        "auth": build_auth_response(email, client_type),
        "user": build_user_response(user_document),
    }


@app.post("/login")
def login(
    payload: LoginRequest,
    response: Response,
    x_client_type: Optional[str] = Header(default=None),
):
    logger.info("Login request received for email: %s", payload.email)

    try:
        user = get_user_by_email(payload.email)
    except ServerSelectionTimeoutError as error:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.") from error

    if not user or not pwd_context.verify(payload.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    client_type = resolve_client_type(x_client_type)

    if client_type == "web":
        set_session_cookie(response, create_session(user["email"]))

    return {
        "success": True,
        "message": f"Welcome back, {user['fullName']}!",
        "auth": build_auth_response(user["email"], client_type),
        "user": build_user_response(user),
    }


@app.post("/logout")
def logout(
    response: Response,
    session_id: Optional[str] = Cookie(default=None, alias=session_cookie_name),
):
    if session_id:
        delete_session(session_id)

    clear_session_cookie(response)

    return {
        "success": True,
        "message": "You have been logged out.",
    }


@app.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "authenticated": True,
        "user": build_user_response(current_user),
    }


@app.get("/me/toast")
def get_my_toast(current_user: dict = Depends(get_current_user)):
    toast_message = current_user.get("toastMessage")

    return {
        "ready": bool(toast_message),
        "toastMessage": toast_message,
    }


@app.get("/me/toast/stream")
async def stream_my_toast(current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    stream_timeout_seconds = 12

    async def event_stream():
        started_at = time.monotonic()

        while time.monotonic() - started_at < stream_timeout_seconds:
            user = get_user_by_email(email)
            toast_message = user.get("toastMessage") if user else None

            if toast_message:
                payload = json.dumps({"toastMessage": toast_message})
                yield f"event: toast-ready\ndata: {payload}\n\n"
                return

            yield "event: heartbeat\ndata: {}\n\n"
            await asyncio.sleep(0.5)

        yield "event: timeout\ndata: {}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
