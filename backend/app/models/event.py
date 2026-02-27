from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from app.utils.object_id import PyObjectId

EventType = Literal["CALL", "MESSAGE", "LOCATION", "APP_USAGE", "DELETION", "SYSTEM"]


class EventDocument(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    case_id: PyObjectId
    event_type: EventType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)
    raw_text: str
    is_deleted: bool = False
    embedding_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
