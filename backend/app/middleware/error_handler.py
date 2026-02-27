from collections.abc import Awaitable, Callable

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.logging import get_logger
from app.utils.exceptions import APIException

logger = get_logger(__name__)


class ErrorHandlerMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        await self.app(scope, receive, send)


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, APIException):
        logger.warning(
            "api_exception",
            extra={
                "path": request.url.path,
                "method": request.method,
                "code": exc.code,
                "status_code": exc.status_code,
                "details": exc.details,
            },
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": {
                    "message": exc.message,
                    "code": exc.code,
                    "details": exc.details,
                }
            },
        )
    logger.exception(
        "unhandled_exception",
        extra={"path": request.url.path, "method": request.method, "error": str(exc)},
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
