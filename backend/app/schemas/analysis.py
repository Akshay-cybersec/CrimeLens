from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field

from app.schemas.event import EventResponse
from app.schemas.insight_schema import InsightResponse


class EvidenceClusterResponse(BaseModel):
    id: str
    risk_score: float
    related_event_ids: list[str]
    related_events: list[EventResponse] = Field(default_factory=list)
    anomaly_type: str
    reasoning: str


class EvidenceAnalysisResponse(BaseModel):
    case_id: str
    clusters: list[EvidenceClusterResponse]


class SearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)
    top_k: int = Field(default=10, ge=1, le=50)


class SearchResponse(BaseModel):
    interpreted_query: str
    matching_events: list[EventResponse]
    explanation: str


class SimilarCaseResponse(BaseModel):
    case_id: str
    similarity_score: float
    crime_type: Optional[str] = None
    explanation: str
    shared_behavioral_signals: list[str] = Field(default_factory=list)


class BehavioralIndexResponse(BaseModel):
    case_id: str
    indexed: bool
    behavioral_features: dict[str, Any]
    behavioral_summary: str


class GraphNodeResponse(BaseModel):
    id: str
    label: str
    node_type: str
    score: float = 0.0


class GraphEdgeResponse(BaseModel):
    source: str
    target: str
    relation: str
    weight: float = 1.0
    evidence_event_ids: list[str] = Field(default_factory=list)


class HiddenClusterResponse(BaseModel):
    persons: list[str]
    shared_points: list[str] = Field(default_factory=list)
    interaction_count: int = 0
    message: str


class ConnectionGraphResponse(BaseModel):
    case_id: str
    nodes: list[GraphNodeResponse] = Field(default_factory=list)
    edges: list[GraphEdgeResponse] = Field(default_factory=list)
    indirect_paths: list[list[str]] = Field(default_factory=list)
    hidden_clusters: list[HiddenClusterResponse] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)
