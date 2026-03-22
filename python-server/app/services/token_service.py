import hashlib
import secrets
import time

import jwt
from fastapi import HTTPException
from jwt import ExpiredSignatureError, InvalidTokenError

from app import config


def create_access_token(email: str, session_id: str, client_type: str) -> str:
    now = int(time.time())
    payload = {
        "sub": email.lower(),
        "sid": session_id,
        "clientType": client_type,
        "type": "access",
        "iss": config.JWT_ISSUER,
        "aud": config.JWT_AUDIENCE,
        "iat": now,
        "exp": now + config.AUTH_ACCESS_TOKEN_TTL_SECONDS,
        "jti": secrets.token_urlsafe(16),
    }
    return jwt.encode(payload, config.JWT_ACCESS_TOKEN_SECRET, algorithm="HS256")


def create_stream_token(email: str) -> str:
    now = int(time.time())
    payload = {
        "sub": email.lower(),
        "type": "stream",
        "iss": config.JWT_ISSUER,
        "aud": config.JWT_AUDIENCE,
        "iat": now,
        "exp": now + config.STREAM_TOKEN_TTL_SECONDS,
        "jti": secrets.token_urlsafe(16),
    }
    return jwt.encode(payload, config.STREAM_TOKEN_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            config.JWT_ACCESS_TOKEN_SECRET,
            algorithms=["HS256"],
            audience=config.JWT_AUDIENCE,
            issuer=config.JWT_ISSUER,
        )
    except ExpiredSignatureError as error:
        raise HTTPException(status_code=401, detail="Authentication token has expired.") from error
    except InvalidTokenError as error:
        raise HTTPException(status_code=401, detail="Invalid authentication token.") from error

    if payload.get("type") != "access" or not payload.get("sub") or not payload.get("sid"):
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

    return payload


def decode_stream_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            config.STREAM_TOKEN_SECRET,
            algorithms=["HS256"],
            audience=config.JWT_AUDIENCE,
            issuer=config.JWT_ISSUER,
        )
    except ExpiredSignatureError as error:
        raise HTTPException(status_code=401, detail="Stream session has expired.") from error
    except InvalidTokenError as error:
        raise HTTPException(status_code=401, detail="Invalid stream session.") from error

    if payload.get("type") != "stream" or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid stream session.")

    return payload


def hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_refresh_token(session_id: str) -> str:
    return f"{session_id}.{secrets.token_urlsafe(48)}"


def parse_refresh_token(raw_token: str) -> tuple[str, str]:
    session_id, separator, token_secret = raw_token.partition(".")

    if not separator or not session_id or not token_secret:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    return session_id, token_secret
