from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from pymongo import DESCENDING

from app.models.case import CaseDocument
from app.repositories.base import BaseRepository


class CaseRepository(BaseRepository):
    def __init__(self, db: Any) -> None:
        super().__init__(db, "cases")

    async def create(self, case: CaseDocument) -> CaseDocument:
        payload = case.model_dump(by_alias=True, exclude_none=True)
        result = await self.collection.insert_one(payload)
        case.id = result.inserted_id
        return case

    async def get_by_id(self, case_id: str) -> Optional[CaseDocument]:
        data = await self.collection.find_one({"_id": ObjectId(case_id)})
        return CaseDocument(**data) if data else None

    async def list_recent(self, limit: int = 100) -> list[CaseDocument]:
        cursor = self.collection.find({}).sort("created_at", DESCENDING).limit(limit)
        return [CaseDocument(**row) async for row in cursor]

    async def update_timestamp(self, case_id: str) -> None:
        await self.collection.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": {"updated_at": datetime.now(timezone.utc)}},
        )
