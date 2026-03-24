import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.db import ensure_indexes
from app.http_observability import attach_request_observability
from app.routes.auth_routes import router as auth_router
from app.routes.chatbot_routes import router as chatbot_router
from app.routes.health_routes import router as health_router
from app.routes.telemetry_routes import router as telemetry_router


logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def configure_cors(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def register_routes(app: FastAPI) -> None:
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(chatbot_router)
    app.include_router(telemetry_router)


def create_app() -> FastAPI:
    app = FastAPI(title=config.APP_TITLE)
    configure_cors(app)
    attach_request_observability(app, logger)
    register_routes(app)
    return app


ensure_indexes()
app = create_app()
