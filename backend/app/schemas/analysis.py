from pydantic import BaseModel, Field

from app.schemas.event import EventResponse


class EvidenceClusterResponse(BaseModel):
    id: str
    risk_score: float
    related_event_ids: list[str]
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


class InsightResponse(BaseModel):
    id: str
    summary: str
    supporting_event_ids: list[str]
    confidence_score: float
    reasoning: str


class SimilarCaseResponse(BaseModel):
    similar_case_id: str
    similarity_score: float
    explanation: str
