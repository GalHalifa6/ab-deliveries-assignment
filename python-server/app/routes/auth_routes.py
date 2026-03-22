import asyncio
import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Body, Cookie, Depends, Header, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr

from app import config
from app.services import auth_service


logger = logging.getLogger(__name__)
router = APIRouter()


class RegistrationRequest(BaseModel):
    fullName: str
    phone: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refreshToken: Optional[str] = None


class LogoutRequest(BaseModel):
    refreshToken: Optional[str] = None


def require_current_user(authorization: Optional[str] = Header(default=None)):
    return auth_service.get_current_user(authorization)


def require_stream_user(stream_token: Optional[str] = Cookie(default=None, alias=config.STREAM_COOKIE_NAME)):
    return auth_service.get_stream_user(stream_token)


@router.post("/register")
def register(
    payload: RegistrationRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    x_client_type: Optional[str] = Header(default=None),
):
    logger.info("Registration request received for email: %s", payload.email)
    return auth_service.register_user(payload, background_tasks, response, x_client_type)


@router.post("/login")
def login(
    payload: LoginRequest,
    response: Response,
    x_client_type: Optional[str] = Header(default=None),
):
    logger.info("Login request received for email: %s", payload.email)
    return auth_service.login_user(payload, response, x_client_type)


@router.post("/refresh")
def refresh(
    response: Response,
    payload: Optional[RefreshRequest] = Body(default=None),
    x_client_type: Optional[str] = Header(default=None),
    refresh_token_cookie: Optional[str] = Cookie(default=None, alias=config.REFRESH_COOKIE_NAME),
):
    return auth_service.refresh_auth(
        response,
        payload.refreshToken if payload else None,
        refresh_token_cookie,
        x_client_type,
    )


@router.post("/logout")
def logout(
    response: Response,
    payload: Optional[LogoutRequest] = Body(default=None),
    x_client_type: Optional[str] = Header(default=None),
    refresh_token_cookie: Optional[str] = Cookie(default=None, alias=config.REFRESH_COOKIE_NAME),
):
    return auth_service.logout(
        response,
        payload.refreshToken if payload else None,
        refresh_token_cookie,
        x_client_type,
    )


@router.post("/logout-all")
def logout_all(response: Response, current_user: dict = Depends(require_current_user)):
    return auth_service.logout_all(response, current_user)


@router.post("/me/toast/stream-session")
def create_toast_stream_session(response: Response, current_user: dict = Depends(require_current_user)):
    return auth_service.issue_stream_session(response, current_user)


@router.get("/me")
def get_me(current_user: dict = Depends(require_current_user)):
    return {
        "authenticated": True,
        "user": auth_service.build_user_response(current_user),
    }


@router.get("/me/toast")
def get_my_toast(current_user: dict = Depends(require_current_user)):
    toast_message = current_user.get("toastMessage")

    return {
        "ready": bool(toast_message),
        "toastMessage": toast_message,
    }


@router.get("/me/toast/stream")
async def stream_my_toast(current_user: dict = Depends(require_stream_user)):
    email = current_user["email"]
    stream_timeout_seconds = 12

    async def event_stream():
        started_at = time.monotonic()

        while time.monotonic() - started_at < stream_timeout_seconds:
            user = auth_service.get_user_by_email(email)
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
