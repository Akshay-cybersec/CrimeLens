from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import mongo_manager
from app.core.logging import configure_logging
from app.middleware.audit import AuditMiddleware
from app.middleware.error_handler import generic_exception_handler
from app.middleware.rate_limit import RateLimitMiddleware
from app.repositories.user_repository import UserRepository
from app.routers import auth, cases, health
from app.services.redis_service import RedisService
from app.vector.chroma_client import ChromaCloudStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging()

    await mongo_manager.connect()
    app.state.mongo_db = mongo_manager.db

    redis_service = RedisService(settings)
    await redis_service.connect()

    app.state.redis_service = redis_service
    app.state.vector_store = ChromaCloudStore(settings)
    await app.state.vector_store.initialize()
    user_repo = UserRepository(mongo_manager.db)
    await user_repo.ensure_indexes()
    await user_repo.ensure_super_admin(
        email=settings.super_admin_email,
        password=settings.super_admin_password,
        full_name=settings.super_admin_full_name,
    )

    yield

    await redis_service.close()
    await mongo_manager.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(RateLimitMiddleware, settings=settings)
    app.add_middleware(AuditMiddleware)
    app.add_exception_handler(Exception, generic_exception_handler)

    app.include_router(health.router)
    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(cases.router, prefix=settings.api_prefix)

    return app


app = create_app()
