from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, UploadFile

from app.core.deps import (
    get_background_worker,
    get_case_behavior_service,
    get_case_service,
    get_evidence_service,
    get_insight_service,
    get_search_service,
    get_similar_case_service,
    get_timeline_service,
)
from app.core.security import AuthUser, get_current_user, require_roles
from app.schemas.analysis import (
    BehavioralIndexResponse,
    EvidenceAnalysisResponse,
    InsightResponse,
    SearchRequest,
    SearchResponse,
    SimilarCaseResponse,
)
from app.schemas.case import CaseCreateResponse, TimelineResponse
from app.services.background_worker import BackgroundWorkerService
from app.services.case_behavior_service import CaseBehaviorService
from app.services.case_service import CaseService
from app.services.evidence_service import EvidenceService
from app.services.insight_service import InsightService
from app.services.search_service import SearchService
from app.services.similar_case_service import SimilarCaseService
from app.services.timeline_service import TimelineService

router = APIRouter(prefix="/cases", tags=["cases"])


@router.post("/upload", response_model=CaseCreateResponse)
async def upload_case(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(default=None),
    user: AuthUser = Depends(require_roles(["SUPER_ADMIN", "ADMIN", "INVESTIGATOR"])),
    case_service: CaseService = Depends(get_case_service),
    background_worker: BackgroundWorkerService = Depends(get_background_worker),
) -> CaseCreateResponse:
    created = await case_service.upload_case(file=file, title=title, description=description, user=user)
    background_tasks.add_task(background_worker.process_case, created.case_id)
    return created


@router.post("/{case_id}/behavioral-index", response_model=BehavioralIndexResponse)
async def behavioral_index(
    case_id: str,
    user: AuthUser = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    behavior_service: CaseBehaviorService = Depends(get_case_behavior_service),
) -> BehavioralIndexResponse:
    await case_service.authorize_case_access(case_id, user)
    return await behavior_service.index_case_behavior(case_id)


@router.get("/{case_id}/timeline", response_model=TimelineResponse)
async def case_timeline(
    case_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    user: AuthUser = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    timeline_service: TimelineService = Depends(get_timeline_service),
) -> TimelineResponse:
    await case_service.authorize_case_access(case_id, user)
    return await timeline_service.build_timeline(case_id, page=page, page_size=page_size)


@router.get("/{case_id}/evidence-analysis", response_model=EvidenceAnalysisResponse)
async def evidence_analysis(
    case_id: str,
    user: AuthUser = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    evidence_service: EvidenceService = Depends(get_evidence_service),
) -> EvidenceAnalysisResponse:
    await case_service.authorize_case_access(case_id, user)
    return await evidence_service.analyze(case_id)


@router.post("/{case_id}/search", response_model=SearchResponse)
async def semantic_search(
    case_id: str,
    payload: SearchRequest,
    user: AuthUser = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    search_service: SearchService = Depends(get_search_service),
) -> SearchResponse:
    await case_service.authorize_case_access(case_id, user)
    return await search_service.semantic_search(case_id, payload)


@router.get("/{case_id}/insights", response_model=list[InsightResponse])
async def investigative_insights(
    case_id: str,
    user: AuthUser = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    insight_service: InsightService = Depends(get_insight_service),
) -> list[InsightResponse]:
    await case_service.authorize_case_access(case_id, user)
    return await insight_service.generate(case_id)


@router.get("/{case_id}/similar-cases", response_model=list[SimilarCaseResponse])
async def similar_cases(
    case_id: str,
    top_k: int = Query(default=5, ge=1, le=20),
    user: AuthUser = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    similar_service: SimilarCaseService = Depends(get_similar_case_service),
) -> list[SimilarCaseResponse]:
    await case_service.authorize_case_access(case_id, user)
    return await similar_service.find_similar(case_id, top_k=top_k)
