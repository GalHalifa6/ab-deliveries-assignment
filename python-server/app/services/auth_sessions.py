import secrets
import time

from fastapi import HTTPException
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from app import config
from app.repositories.refresh_session_repository import refresh_session_repository
from app.services import token_service


def create_refresh_session(email: str, client_type: str) -> tuple[dict, str]:
    now = int(time.time())
    session_id = secrets.token_urlsafe(24)
    refresh_token = token_service.generate_refresh_token(session_id)
    session_document = {
        "sessionId": session_id,
        "userEmail": email.lower(),
        "clientType": client_type,
        "refreshTokenHash": token_service.hash_refresh_token(refresh_token),
        "tokenFamilyId": secrets.token_urlsafe(18),
        "createdAt": now,
        "expiresAt": now + config.AUTH_REFRESH_TOKEN_TTL_SECONDS,
        "lastUsedAt": now,
        "revokedAt": None,
    }

    try:
        refresh_session_repository.create_session(session_document)
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail="Database error while creating the session.") from error

    return session_document, refresh_token


def get_refresh_session(session_id: str) -> dict | None:
    try:
        return refresh_session_repository.get_session(session_id)
    except ServerSelectionTimeoutError as error:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.") from error
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail="Database error while loading the session.") from error


def revoke_refresh_session(session_id: str) -> None:
    try:
        refresh_session_repository.revoke_session(session_id, int(time.time()))
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail="Database error while revoking the session.") from error


def rotate_refresh_session(session_id: str, refresh_token: str) -> None:
    now = int(time.time())

    try:
        refresh_session_repository.rotate_session(
            session_id,
            token_service.hash_refresh_token(refresh_token),
            now + config.AUTH_REFRESH_TOKEN_TTL_SECONDS,
            now,
        )
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail="Database error while rotating the session.") from error


def revoke_all_refresh_sessions(user_email: str) -> None:
    try:
        refresh_session_repository.revoke_all_sessions(user_email, int(time.time()))
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail="Database error while revoking sessions.") from error
