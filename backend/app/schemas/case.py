from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.event import EventResponse
from app.utils.pagination import PageMeta


class CaseCreateResponse(BaseModel):
    case_id: str
    title: str
    source_filename: str
    events_ingested: int


class TimelineResponse(BaseModel):
    case_id: str
    time_range: dict[str, datetime | None]
    activity_density_score: float
    suspicious_windows: list[dict]
    pagination: PageMeta
    timeline: list[EventResponse]


class UploadCaseForm(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
