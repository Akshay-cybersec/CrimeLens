from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.insight import InsightDocument


class InsightRepository:
    def __init__(self, db: AsyncIOMotorDatabase[Any]) -> None:
        self.collection = db["insights"]

    async def create(self, insight: InsightDocument) -> InsightDocument:
        result = await self.collection.insert_one(insight.model_dump(by_alias=True, exclude_none=True))
        insight.id = result.inserted_id
        return insight

    async def list_by_case(self, case_id: str) -> list[InsightDocument]:
        cursor = self.collection.find({"case_id": ObjectId(case_id)}).sort("created_at", -1)
        return [InsightDocument(**row) async for row in cursor]

    async def latest_by_case(self, case_id: str) -> Optional[InsightDocument]:
        data = await self.collection.find_one({"case_id": ObjectId(case_id)}, sort=[("created_at", -1)])
        return InsightDocument(**data) if data else None

    async def has_any(self, case_id: str) -> bool:
        count = await self.collection.count_documents({"case_id": ObjectId(case_id)}, limit=1)
        return count > 0

    async def last_generated_at(self, case_id: str) -> Optional[datetime]:
        latest = await self.latest_by_case(case_id)
        return latest.created_at if latest else None

    async def delete_by_case(self, case_id: str) -> int:
        result = await self.collection.delete_many({"case_id": ObjectId(case_id)})
        return int(result.deleted_count)
