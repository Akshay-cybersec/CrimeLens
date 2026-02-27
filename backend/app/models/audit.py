from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.utils.object_id import PyObjectId


class AuditLogDocument(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: Optional[str] = None
    role: Optional[str] = None
    method: str
    path: str
    status_code: int
    context: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
