from datetime import datetime
from typing import Any

from bson import ObjectId
from pymongo import ASCENDING

from app.models.event import EventDocument
from app.repositories.base import BaseRepository


class EventRepository(BaseRepository):
    def __init__(self, db: Any) -> None:
        super().__init__(db, "events")

    async def insert_many(self, events: list[EventDocument]) -> list[EventDocument]:
        if not events:
            return []
        payloads = [event.model_dump(by_alias=True, exclude_none=True) for event in events]
        result = await self.collection.insert_many(payloads)
        for event, event_id in zip(events, result.inserted_ids, strict=False):
            event.id = event_id
        return events

    async def list_by_case(
        self,
        case_id: str,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[EventDocument], int]:
        filter_query = {"case_id": ObjectId(case_id)}
        total = await self.collection.count_documents(filter_query)
        skip = (page - 1) * page_size
        cursor = (
            self.collection.find(filter_query)
            .sort("timestamp", ASCENDING)
            .skip(skip)
            .limit(page_size)
        )
        events = [EventDocument(**row) async for row in cursor]
        return events, total

    async def all_by_case(self, case_id: str) -> list[EventDocument]:
        cursor = self.collection.find({"case_id": ObjectId(case_id)}).sort("timestamp", ASCENDING)
        return [EventDocument(**row) async for row in cursor]

    async def aggregate_timeline(self, case_id: str) -> list[dict[str, Any]]:
        pipeline = [
            {"$match": {"case_id": ObjectId(case_id)}},
            {
                "$group": {
                    "_id": {
                        "$dateTrunc": {
                            "date": "$timestamp",
                            "unit": "hour",
                        }
                    },
                    "count": {"$sum": 1},
                    "deletions": {
                        "$sum": {
                            "$cond": [{"$eq": ["$event_type", "DELETION"]}, 1, 0]
                        }
                    },
                }
            },
            {"$sort": {"_id": 1}},
        ]
        cursor = self.collection.aggregate(pipeline)
        return [row async for row in cursor]

    async def upsert_embedding_ref(self, event_id: str, embedding_id: str) -> None:
        await self.collection.update_one(
            {"_id": ObjectId(event_id)},
            {"$set": {"embedding_id": embedding_id}},
        )

    async def by_ids(self, ids: list[str]) -> list[EventDocument]:
        object_ids = [ObjectId(item) for item in ids]
        cursor = self.collection.find({"_id": {"$in": object_ids}})
        return [EventDocument(**row) async for row in cursor]

    async def suspicious_counts(self, case_id: str, start: datetime, end: datetime) -> dict[str, int]:
        pipeline = [
            {
                "$match": {
                    "case_id": ObjectId(case_id),
                    "timestamp": {"$gte": start, "$lte": end},
                }
            },
            {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        ]
        counts: dict[str, int] = {}
        cursor = self.collection.aggregate(pipeline)
        async for row in cursor:
            counts[str(row.get("_id"))] = int(row.get("count", 0))
        return counts
