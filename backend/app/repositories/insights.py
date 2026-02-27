from typing import Any

from bson import ObjectId

from app.models.insight import InsightDocument
from app.repositories.base import BaseRepository


class InsightRepository(BaseRepository):
    def __init__(self, db: Any) -> None:
        super().__init__(db, "insights")

    async def create(self, insight: InsightDocument) -> InsightDocument:
        result = await self.collection.insert_one(insight.model_dump(by_alias=True, exclude_none=True))
        insight.id = result.inserted_id
        return insight

    async def list_by_case(self, case_id: str) -> list[InsightDocument]:
        cursor = self.collection.find({"case_id": ObjectId(case_id)}).sort("created_at", -1)
        return [InsightDocument(**row) async for row in cursor]
