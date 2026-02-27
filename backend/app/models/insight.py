from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field

from app.utils.object_id import PyObjectId


class InsightDocument(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    case_id: PyObjectId
    summary: str
    supporting_event_ids: list[PyObjectId] = Field(default_factory=list)
    confidence_score: float = Field(ge=0, le=1)
    reasoning: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
