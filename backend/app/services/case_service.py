from __future__ import annotations

from typing import Any, Optional

from bson import ObjectId
from fastapi import HTTPException, UploadFile, status

from app.core.security import AuthUser
from app.models.case import CaseDocument
from app.repositories.cases import CaseRepository
from app.repositories.events import EventRepository
from app.schemas.case import CaseCreateResponse
from app.services.redis_service import RedisService
from app.services.ufdr_parser import UFDRParserService


class CaseService:
    def __init__(
        self,
        case_repo: CaseRepository,
        event_repo: EventRepository,
        parser_service: UFDRParserService,
        redis_service: RedisService,
        max_upload_size_mb: int,
    ) -> None:
        self.case_repo = case_repo
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

        events = await self.parser_service.parse_pdf_events(created_case.id, file_bytes)
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

    async def as_object_id(self, case_id: str) -> ObjectId:
        if not ObjectId.is_valid(case_id):
            raise HTTPException(status_code=400, detail="Invalid case id")
        return ObjectId(case_id)
