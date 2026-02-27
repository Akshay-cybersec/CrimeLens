from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field

from app.utils.object_id import PyObjectId


class AuditLogDocument(BaseModel):
    id: PyObjectId | None = Field(default=None, alias="_id")
    user_id: str | None = None
    role: str | None = None
    method: str
    path: str
    status_code: int
    context: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {"populate_by_name": True}
