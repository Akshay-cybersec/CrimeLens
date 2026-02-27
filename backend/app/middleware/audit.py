from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_access_token
from app.models.audit import AuditLogDocument
from app.repositories.audits import AuditRepository


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        if request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
            return response

        db = request.app.state.mongo_db
        audit_repo = AuditRepository(db)

        auth = request.headers.get("authorization", "")
        user_id = None
        role = None
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
            try:
                payload = decode_access_token(token)
                user_id = payload.sub
                role = payload.role
            except Exception:
                user_id = None
                role = None

        log = AuditLogDocument(
            user_id=user_id,
            role=role,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            context={"query": dict(request.query_params)},
            created_at=datetime.now(UTC),
        )
        await audit_repo.create(log)

        return response
