from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.case import CaseStatus
from app.schemas.event import EventResponse
from app.utils.pagination import PageMeta


class CaseCreateResponse(BaseModel):
    case_id: str
    title: str
    source_filename: str
    events_ingested: int


class TimelineResponse(BaseModel):
    case_id: str
    time_range: dict[str, Optional[datetime]]
    activity_density_score: float
    suspicious_windows: list[dict]
    pagination: PageMeta
    timeline: list[EventResponse]


class CaseListItemResponse(BaseModel):
    case_id: str
    title: str
    description: Optional[str] = None
    source_filename: str
    owner_id: str
    status: CaseStatus
    created_at: datetime
    updated_at: datetime


class CaseOverviewResponse(BaseModel):
    case_id: str
    title: str
    description: Optional[str] = None
    source_filename: str
    owner_id: str
    status: CaseStatus
    source_filenames: list[str] = Field(default_factory=list)
    assigned_user_ids: list[str]
    created_at: datetime
    updated_at: datetime
    total_events: int
    event_types: dict[str, int]
    latest_events: list[EventResponse] = Field(default_factory=list)


class DashboardMetricsResponse(BaseModel):
    total_cases: int
    cases_with_insights: int
    active_cases: int
    flagged_clusters: int
    total_artifacts: int
    flagged_messages: int
    media_files: int
    location_pins: int


class CaseStatusUpdateRequest(BaseModel):
    status: CaseStatus


class CaseStatusUpdateResponse(BaseModel):
    case_id: str
    status: CaseStatus
    message: str
