from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.utils.object_id import PyObjectId

EventType = Literal["CALL", "MESSAGE", "LOCATION", "APP_USAGE", "DELETION", "SYSTEM"]


class EventDocument(BaseModel):
    id: PyObjectId | None = Field(default=None, alias="_id")
    case_id: PyObjectId
    event_type: EventType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    metadata: dict[str, Any] = Field(default_factory=dict)
    raw_text: str
    is_deleted: bool = False
    embedding_id: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {"populate_by_name": True}
