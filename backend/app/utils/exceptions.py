from __future__ import annotations

from typing import Any, Optional


class APIException(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str = "API_ERROR",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}
        super().__init__(message)


class AppError(APIException):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message=message, status_code=status_code, code="APP_ERROR")
