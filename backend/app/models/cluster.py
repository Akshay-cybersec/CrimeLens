from datetime import UTC, datetime

from pydantic import BaseModel, Field

from app.utils.object_id import PyObjectId


class ClusterDocument(BaseModel):
    id: PyObjectId | None = Field(default=None, alias="_id")
    case_id: PyObjectId
    risk_score: float = Field(ge=0, le=1)
    related_event_ids: list[PyObjectId] = Field(default_factory=list)
    anomaly_type: str
    reasoning: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {"populate_by_name": True}
