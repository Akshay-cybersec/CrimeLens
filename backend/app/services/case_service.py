from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException, UploadFile, status

from app.core.security import AuthUser
from app.models.case import CaseDocument
from app.repositories.cases import CaseRepository
from app.repositories.dashboard_metrics import DashboardMetricsRepository
from app.repositories.events import EventRepository
from app.schemas.case import CaseCreateResponse, CaseListItemResponse, CaseOverviewResponse, DashboardMetricsResponse
from app.schemas.event import EventResponse
from app.services.redis_service import RedisService
from app.services.ufdr_parser import UFDRParserService


class CaseService:
    def __init__(
        self,
        case_repo: CaseRepository,
        metrics_repo: DashboardMetricsRepository,
        event_repo: EventRepository,
        parser_service: UFDRParserService,
        redis_service: RedisService,
        max_upload_size_mb: int,
    ) -> None:
        self.case_repo = case_repo
        self.metrics_repo = metrics_repo
        self.event_repo = event_repo
        self.parser_service = parser_service
        self.redis_service = redis_service
        self.max_upload_size_mb = max_upload_size_mb

    async def upload_case(
        self,
        file: UploadFile,
        title: str,
        description: Optional[str],
        user: AuthUser,
    ) -> CaseCreateResponse:
        file_bytes = await file.read()
        max_size = self.max_upload_size_mb * 1024 * 1024
        if len(file_bytes) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds {self.max_upload_size_mb} MB",
            )

        case_doc = CaseDocument(
            title=title,
            description=description,
            source_filename=file.filename or "unknown.pdf",
            owner_id=user.id,
            assigned_user_ids=[user.id],
        )
        created_case = await self.case_repo.create(case_doc)

        events = await self.parser_service.parse_events(
            case_id=created_case.id,
            file_bytes=file_bytes,
            filename=file.filename,
        )
        inserted = await self.event_repo.insert_many(events)

        await self.redis_service.enqueue_case_job(str(created_case.id))

        return CaseCreateResponse(
            case_id=str(created_case.id),
            title=created_case.title,
            source_filename=created_case.source_filename,
            events_ingested=len(inserted),
        )

    async def authorize_case_access(self, case_id: str, user: AuthUser) -> CaseDocument:
        case_doc = await self.case_repo.get_by_id(case_id)
        if case_doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

        if user.role in {"SUPER_ADMIN", "ADMIN"}:
            return case_doc

        allowed = user.id == case_doc.owner_id or user.id in case_doc.assigned_user_ids
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Case access denied")
        return case_doc

    async def get_case_stats(self, case_id: str) -> dict[str, Any]:
        events, total = await self.event_repo.list_by_case(case_id, page=1, page_size=10000)
        event_types: dict[str, int] = {}
        for event in events:
            event_types[event.event_type] = event_types.get(event.event_type, 0) + 1
        return {"total_events": total, "event_types": event_types}

    async def list_cases_for_user(self, user: AuthUser, limit: int = 100) -> list[CaseListItemResponse]:
        cases = await self.case_repo.list_recent(limit=limit)
        if user.role in {"SUPER_ADMIN", "ADMIN"}:
            visible = cases
        else:
            visible = [
                case
                for case in cases
                if user.id == case.owner_id or user.id in case.assigned_user_ids
            ]
        return [
            CaseListItemResponse(
                case_id=str(case.id),
                title=case.title,
                description=case.description,
                source_filename=case.source_filename,
                owner_id=case.owner_id,
                created_at=case.created_at,
                updated_at=case.updated_at,
            )
            for case in visible
        ]

    async def get_case_overview(self, case_id: str, user: AuthUser) -> CaseOverviewResponse:
        case_doc = await self.authorize_case_access(case_id, user)
        stats = await self.get_case_stats(case_id)
        latest_events, _ = await self.event_repo.list_by_case(case_id, page=1, page_size=10)
        latest = sorted(latest_events, key=lambda item: item.timestamp, reverse=True)
        latest_responses = [
            EventResponse(
                id=str(item.id),
                case_id=str(item.case_id),
                event_type=item.event_type,
                timestamp=item.timestamp,
                metadata=item.metadata,
                raw_text=item.raw_text,
                is_deleted=item.is_deleted,
            )
            for item in latest
        ]
        return CaseOverviewResponse(
            case_id=str(case_doc.id),
            title=case_doc.title,
            description=case_doc.description,
            source_filename=case_doc.source_filename,
            owner_id=case_doc.owner_id,
            assigned_user_ids=case_doc.assigned_user_ids,
            created_at=case_doc.created_at,
            updated_at=case_doc.updated_at,
            total_events=int(stats.get("total_events", 0)),
            event_types=stats.get("event_types", {}),
            latest_events=latest_responses,
        )

    async def get_dashboard_metrics(self) -> DashboardMetricsResponse:
        data = await self.metrics_repo.get_metrics()
        return DashboardMetricsResponse(**data)
