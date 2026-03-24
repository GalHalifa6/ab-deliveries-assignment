from fastapi import Response

from app import config


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=config.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=config.REFRESH_COOKIE_SECURE,
        samesite=config.REFRESH_COOKIE_SAMESITE,
        max_age=config.AUTH_REFRESH_TOKEN_TTL_SECONDS,
        path="/",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=config.REFRESH_COOKIE_NAME,
        httponly=True,
        secure=config.REFRESH_COOKIE_SECURE,
        samesite=config.REFRESH_COOKIE_SAMESITE,
        path="/",
    )


def set_stream_cookie(response: Response, stream_token: str) -> None:
    response.set_cookie(
        key=config.STREAM_COOKIE_NAME,
        value=stream_token,
        httponly=True,
        secure=config.STREAM_COOKIE_SECURE,
        samesite=config.STREAM_COOKIE_SAMESITE,
        max_age=config.STREAM_TOKEN_TTL_SECONDS,
        path="/me/toast/stream",
    )


def clear_stream_cookie(response: Response) -> None:
    response.delete_cookie(
        key=config.STREAM_COOKIE_NAME,
        httponly=True,
        secure=config.STREAM_COOKIE_SECURE,
        samesite=config.STREAM_COOKIE_SAMESITE,
        path="/me/toast/stream",
    )
