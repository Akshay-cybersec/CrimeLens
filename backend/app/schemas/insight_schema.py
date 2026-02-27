from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DetectedPattern(BaseModel):
    type: str
    related_event_ids: list[str]
    metadata_summary: dict[str, Any]


class InsightResponse(BaseModel):
    id: str
    case_id: str
    summary: str
    supporting_event_ids: list[str]
    contradiction_type: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    ai_reasoning: str
    created_at: datetime
    generated_by_model: str


class RegenerateInsightResponse(BaseModel):
    message: str
    insight: InsightResponse
