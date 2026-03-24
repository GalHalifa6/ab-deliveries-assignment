import hmac
import time
from typing import Optional

from fastapi import HTTPException, Response
from passlib.context import CryptContext
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from app import config
from app.repositories.user_repository import DuplicateKeyError, user_repository
from app.services import auth_cookies, auth_sessions
from app.services import google_auth_service
from app.services import token_service


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
refresh_session_repository = auth_sessions.refresh_session_repository


def resolve_client_type_hint(x_client_type: Optional[str]) -> str:
    if (x_client_type or "").strip().lower() == "mobile":
        return "mobile"
    return "web"


def build_user_response(user: dict) -> dict:
    return {
        "fullName": user["fullName"],
        "phone": user["phone"],
        "email": user["email"],
    }


def build_auth_response(access_token: str, client_type: str) -> dict:
    return {
        "clientType": client_type,
        "accessToken": access_token,
        "accessTokenExpiresIn": config.AUTH_ACCESS_TOKEN_TTL_SECONDS,
    }


def create_refresh_session(email: str, client_type: str) -> tuple[dict, str]:
    auth_sessions.refresh_session_repository = refresh_session_repository
    return auth_sessions.create_refresh_session(email, client_type)


def set_refresh_cookie(response: Response, refresh_token: str):
    auth_cookies.set_refresh_cookie(response, refresh_token)


def clear_refresh_cookie(response: Response):
    auth_cookies.clear_refresh_cookie(response)


def set_stream_cookie(response: Response, stream_token: str):
    auth_cookies.set_stream_cookie(response, stream_token)


def clear_stream_cookie(response: Response):
    auth_cookies.clear_stream_cookie(response)


def _build_user_document(payload) -> dict:
    return {
        "fullName": payload.fullName.strip(),
        "phone": payload.phone.strip(),
        "email": payload.email.lower(),
        "passwordHash": pwd_context.hash(payload.password),
        "authProvider": "password",
        "toastMessage": None,
        "createdAt": int(time.time()),
    }


def _build_google_user_document(google_profile: dict) -> dict:
    return {
        "fullName": google_profile["fullName"],
        "phone": "",
        "email": google_profile["email"],
        "passwordHash": None,
        "authProvider": "google",
        "googleSubject": google_profile.get("googleSubject"),
        "avatarUrl": google_profile.get("picture"),
        "toastMessage": None,
        "createdAt": int(time.time()),
    }


def _persist_new_user(user_document: dict) -> None:
    try:
        user_repository.create_user(user_document)
    except DuplicateKeyError as error:
        raise HTTPException(status_code=409, detail="A user with this email already exists.") from error
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail="Database error while saving the user.") from error


def _issue_web_auth_payload(access_token: str, refresh_token: str, response: Response) -> dict:
    set_refresh_cookie(response, refresh_token)
    return {
        "auth": build_auth_response(access_token, "web"),
    }


def _issue_mobile_auth_payload(access_token: str, refresh_token: str) -> dict:
    return {
        "auth": build_auth_response(access_token, "mobile"),
        "refreshToken": refresh_token,
    }


def issue_auth_payload(email: str, client_type: str, response: Response) -> dict:
    session, refresh_token = create_refresh_session(email, client_type)
    access_token = token_service.create_access_token(email, session["sessionId"], client_type)

    if client_type == "web":
        return _issue_web_auth_payload(access_token, refresh_token, response)

    return _issue_mobile_auth_payload(access_token, refresh_token)


def get_user_by_email(email: str):
    try:
        return user_repository.get_by_email(email)
    except ServerSelectionTimeoutError as error:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.") from error
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail="Database error while loading the user.") from error


def register_user(payload, background_tasks, response: Response, client_type_hint: Optional[str]) -> dict:
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    existing_user = get_user_by_email(payload.email)
    if existing_user:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    user_document = _build_user_document(payload)
    email = user_document["email"]
    _persist_new_user(user_document)

    from app.services.toast_service import generate_and_store_toast_message

    background_tasks.add_task(generate_and_store_toast_message, email)
    client_type = resolve_client_type_hint(client_type_hint)
    auth_result = issue_auth_payload(email, client_type, response)

    return {
        "success": True,
        "message": f"Welcome aboard, {payload.fullName}! Your registration was saved.",
        "toastPending": True,
        **auth_result,
        "user": build_user_response(user_document),
    }


def login_user(payload, response: Response, client_type_hint: Optional[str]) -> dict:
    user = get_user_by_email(payload.email)

    password_hash = user.get("passwordHash") if user else None

    if not user or not password_hash or not pwd_context.verify(payload.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    client_type = resolve_client_type_hint(client_type_hint)
    auth_result = issue_auth_payload(user["email"], client_type, response)

    return {
        "success": True,
        "message": f"Welcome back, {user['fullName']}!",
        **auth_result,
        "user": build_user_response(user),
    }


def _sync_google_user_profile(existing_user: dict, google_profile: dict) -> dict:
    next_name = (existing_user.get("fullName") or "").strip() or google_profile["fullName"]

    user_repository.update_google_profile(
        google_profile["email"],
        next_name,
        google_profile.get("picture"),
    )

    updated_user = dict(existing_user)
    updated_user["fullName"] = next_name
    updated_user["authProvider"] = "google"
    if google_profile.get("picture"):
        updated_user["avatarUrl"] = google_profile["picture"]
    return updated_user


def login_with_google(id_token_value: str, response: Response, client_type_hint: Optional[str]) -> dict:
    google_profile = google_auth_service.verify_google_id_token(id_token_value)
    user = get_user_by_email(google_profile["email"])

    if user:
        user = _sync_google_user_profile(user, google_profile)
    else:
        user = _build_google_user_document(google_profile)
        _persist_new_user(user)

    client_type = resolve_client_type_hint(client_type_hint)
    auth_result = issue_auth_payload(user["email"], client_type, response)

    return {
        "success": True,
        "message": f"Welcome, {user['fullName']}!",
        **auth_result,
        "user": build_user_response(user),
    }


def update_current_user_phone(current_user: dict, phone: str) -> dict:
    normalized_phone = (phone or "").strip()

    if not normalized_phone:
        raise HTTPException(status_code=400, detail="Phone number is required.")

    if len(normalized_phone) < 7:
        raise HTTPException(status_code=400, detail="Phone number looks too short.")

    try:
        user_repository.update_profile_phone(current_user["email"], normalized_phone)
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail="Database error while saving the phone number.") from error

    updated_user = dict(current_user)
    updated_user["phone"] = normalized_phone

    return {
        "success": True,
        "message": "Phone number saved successfully.",
        "user": build_user_response(updated_user),
    }


def get_refresh_token_from_request(client_type_hint: Optional[str], refresh_token_cookie: Optional[str], payload_token: Optional[str]) -> str:
    hinted_client_type = resolve_client_type_hint(client_type_hint)

    if refresh_token_cookie:
        return refresh_token_cookie

    if payload_token:
        return payload_token

    if hinted_client_type == "web":
        raise HTTPException(status_code=401, detail="Refresh token is required.")

    raise HTTPException(status_code=401, detail="Refresh token is required.")


def get_active_refresh_session(raw_refresh_token: str) -> dict:
    session_id, _ = token_service.parse_refresh_token(raw_refresh_token)
    return get_active_refresh_session_by_id(session_id)


def get_active_refresh_session_by_id(session_id: str) -> dict:
    auth_sessions.refresh_session_repository = refresh_session_repository
    session = auth_sessions.get_refresh_session(session_id)

    if not session or session.get("revokedAt"):
        raise HTTPException(status_code=401, detail="Refresh session is invalid or has expired.")

    if session.get("expiresAt", 0) < int(time.time()):
        revoke_refresh_session(session_id)
        raise HTTPException(status_code=401, detail="Refresh session is invalid or has expired.")

    return session


def revoke_refresh_session(session_id: str):
    auth_sessions.refresh_session_repository = refresh_session_repository
    auth_sessions.revoke_refresh_session(session_id)


def validate_refresh_token(raw_refresh_token: str) -> dict:
    session = get_active_refresh_session(raw_refresh_token)

    if not hmac.compare_digest(token_service.hash_refresh_token(raw_refresh_token), session["refreshTokenHash"]):
        revoke_refresh_session(session["sessionId"])
        raise HTTPException(status_code=401, detail="Refresh token is invalid.")

    return session


def rotate_refresh_token(session: dict) -> str:
    new_refresh_token = token_service.generate_refresh_token(session["sessionId"])
    auth_sessions.refresh_session_repository = refresh_session_repository
    auth_sessions.rotate_refresh_session(session["sessionId"], new_refresh_token)

    return new_refresh_token


def _build_refresh_response(
    *,
    response: Response,
    client_type: str,
    access_token: str,
    refresh_token: str,
) -> dict:
    if client_type == "web":
        set_refresh_cookie(response, refresh_token)
        return {
            "success": True,
            "auth": build_auth_response(access_token, client_type),
        }

    return {
        "success": True,
        "auth": build_auth_response(access_token, client_type),
        "refreshToken": refresh_token,
    }


def refresh_auth(response: Response, payload_token: Optional[str], refresh_token_cookie: Optional[str], client_type_hint: Optional[str]) -> dict:
    raw_refresh_token = get_refresh_token_from_request(client_type_hint, refresh_token_cookie, payload_token)
    session = validate_refresh_token(raw_refresh_token)
    new_refresh_token = rotate_refresh_token(session)
    client_type = session["clientType"]
    access_token = token_service.create_access_token(session["userEmail"], session["sessionId"], client_type)

    return _build_refresh_response(
        response=response,
        client_type=client_type,
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


def logout(response: Response, payload_token: Optional[str], refresh_token_cookie: Optional[str], client_type_hint: Optional[str]) -> dict:
    try:
        raw_refresh_token = get_refresh_token_from_request(client_type_hint, refresh_token_cookie, payload_token)
        session = validate_refresh_token(raw_refresh_token)
        revoke_refresh_session(session["sessionId"])

        if session["clientType"] == "web":
            clear_refresh_cookie(response)
            clear_stream_cookie(response)
    except HTTPException:
        if resolve_client_type_hint(client_type_hint) == "web":
            clear_refresh_cookie(response)
            clear_stream_cookie(response)

    return {
        "success": True,
        "message": "You have been logged out.",
    }


def logout_all(response: Response, current_user: dict) -> dict:
    auth_sessions.refresh_session_repository = refresh_session_repository
    auth_sessions.revoke_all_refresh_sessions(current_user["email"])

    clear_refresh_cookie(response)
    clear_stream_cookie(response)
    return {
        "success": True,
        "message": "You have been logged out on all devices.",
    }


def get_current_user(authorization: Optional[str]) -> dict:
    scheme, _, token = (authorization or "").partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Authentication is required.")

    token_payload = token_service.decode_access_token(token)
    user = get_user_by_email(token_payload["sub"])

    if not user:
        raise HTTPException(status_code=401, detail="Authenticated user was not found.")

    if config.ACCESS_TOKEN_REQUIRE_ACTIVE_SESSION:
        session = get_active_refresh_session_by_id(token_payload["sid"])
        if not session:
            raise HTTPException(status_code=401, detail="Authenticated session is no longer active.")

    return user


def issue_stream_session(response: Response, current_user: dict) -> dict:
    stream_token = token_service.create_stream_token(current_user["email"])
    set_stream_cookie(response, stream_token)
    return {
        "success": True,
    }


def get_stream_user(stream_token: Optional[str]) -> dict:
    if not stream_token:
        raise HTTPException(status_code=401, detail="Stream authentication is required.")

    token_payload = token_service.decode_stream_token(stream_token)
    user = get_user_by_email(token_payload["sub"])

    if not user:
        raise HTTPException(status_code=401, detail="Authenticated user was not found.")

    return user
