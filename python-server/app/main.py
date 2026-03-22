from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.db import ensure_indexes
from app.routes.auth_routes import router as auth_router
from app.routes.health_routes import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title=config.APP_TITLE)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(auth_router)
    return app


ensure_indexes()
app = create_app()
