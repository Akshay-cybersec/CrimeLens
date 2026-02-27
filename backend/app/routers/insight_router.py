from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import get_case_service, get_insight_service
from app.core.security import AuthUser, get_current_user, require_roles
from app.schemas.insight_schema import InsightResponse, RegenerateInsightResponse
from app.services.case_service import CaseService
from app.services.insight_service import InsightService

router = APIRouter(prefix="/cases", tags=["insights"])


@router.get("/{case_id}/insights", response_model=list[InsightResponse])
async def get_case_insights(
    case_id: str,
    user: AuthUser = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    insight_service: InsightService = Depends(get_insight_service),
) -> list[InsightResponse]:
    await case_service.authorize_case_access(case_id, user)
    return await insight_service.get_or_generate(case_id)


@router.post(
    "/{case_id}/insights/regenerate",
    response_model=RegenerateInsightResponse,
    dependencies=[Depends(require_roles(["SUPER_ADMIN", "ADMIN"]))],
)
async def regenerate_case_insights(
    case_id: str,
    user: AuthUser = Depends(require_roles(["SUPER_ADMIN", "ADMIN"])),
    case_service: CaseService = Depends(get_case_service),
    insight_service: InsightService = Depends(get_insight_service),
) -> RegenerateInsightResponse:
    await case_service.authorize_case_access(case_id, user)
    insight = await insight_service.regenerate(case_id)
    return RegenerateInsightResponse(message="Insight regenerated successfully", insight=insight)
