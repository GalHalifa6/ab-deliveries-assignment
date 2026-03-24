import logging
import time

from fastapi import FastAPI

from app.observability import build_request_id, log_event


def attach_request_observability(app: FastAPI, logger: logging.Logger) -> None:
    @app.middleware("http")
    async def add_request_observability(request, call_next):
        request_id = request.headers.get("X-Request-ID") or build_request_id()
        request.state.request_id = request_id
        start_time = time.perf_counter()

        log_event(
            logger,
            "http_request_started",
            requestId=request_id,
            method=request.method,
            path=request.url.path,
            clientHost=request.client.host if request.client else None,
        )

        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        log_event(
            logger,
            "http_request_completed",
            requestId=request_id,
            method=request.method,
            path=request.url.path,
            statusCode=response.status_code,
            durationMs=duration_ms,
        )
        return response
