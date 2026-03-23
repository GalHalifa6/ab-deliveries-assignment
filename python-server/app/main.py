import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.db import ensure_indexes
from app.observability import build_request_id, log_event
from app.routes.auth_routes import router as auth_router
from app.routes.chatbot_routes import router as chatbot_router
from app.routes.health_routes import router as health_router
from app.routes.telemetry_routes import router as telemetry_router


logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title=config.APP_TITLE)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(chatbot_router)
    app.include_router(telemetry_router)
    return app


ensure_indexes()
app = create_app()
