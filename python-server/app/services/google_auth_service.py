from fastapi import HTTPException
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token

from app import config


def verify_google_id_token(raw_id_token: str) -> dict:
    if not config.GOOGLE_OAUTH_WEB_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured on the server.")

    try:
        claims = id_token.verify_oauth2_token(
            raw_id_token,
            GoogleRequest(),
            audience=config.GOOGLE_OAUTH_WEB_CLIENT_ID,
        )
    except ValueError as error:
        raise HTTPException(status_code=401, detail="Invalid Google identity token.") from error

    email = (claims.get("email") or "").strip().lower()

    if not email:
        raise HTTPException(status_code=400, detail="Google account did not include an email address.")

    if not claims.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Google account email is not verified.")

    return {
        "email": email,
        "fullName": (claims.get("name") or email.split("@")[0]).strip(),
        "googleSubject": claims.get("sub"),
        "picture": claims.get("picture"),
    }
