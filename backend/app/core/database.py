from collections.abc import AsyncIterator
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, IndexModel

from app.core.config import get_settings


class MongoManager:
    def __init__(self) -> None:
        self._client: AsyncIOMotorClient[Any] | None = None
        self._db: AsyncIOMotorDatabase[Any] | None = None

    async def connect(self) -> None:
        settings = get_settings()
        self._client = AsyncIOMotorClient(settings.mongo_uri)
        self._db = self._client[settings.mongo_db]
        await self._ensure_indexes()

    async def close(self) -> None:
        if self._client:
            self._client.close()

    @property
    def db(self) -> AsyncIOMotorDatabase[Any]:
        if self._db is None:
            raise RuntimeError("Database is not initialized")
        return self._db

    async def _ensure_indexes(self) -> None:
        if self._db is None:
            return

        await self._db["events"].create_indexes(
            [
                IndexModel([("case_id", ASCENDING)]),
                IndexModel([("timestamp", ASCENDING)]),
                IndexModel([("event_type", ASCENDING)]),
                IndexModel([("case_id", ASCENDING), ("timestamp", ASCENDING)]),
            ]
        )

        await self._db["cases"].create_indexes(
            [
                IndexModel([("owner_id", ASCENDING)]),
                IndexModel([("assigned_user_ids", ASCENDING)]),
                IndexModel([("created_at", ASCENDING)]),
            ]
        )

        await self._db["clusters"].create_indexes(
            [
                IndexModel([("case_id", ASCENDING)]),
                IndexModel([("risk_score", ASCENDING)]),
                IndexModel([("created_at", ASCENDING)]),
            ]
        )

        await self._db["insights"].create_indexes(
            [
                IndexModel([("case_id", ASCENDING)]),
                IndexModel([("created_at", ASCENDING)]),
            ]
        )

        await self._db["audit_logs"].create_indexes(
            [
                IndexModel([("user_id", ASCENDING)]),
                IndexModel([("path", ASCENDING)]),
                IndexModel([("created_at", ASCENDING)]),
            ]
        )


mongo_manager = MongoManager()


async def get_db() -> AsyncIterator[AsyncIOMotorDatabase[Any]]:
    yield mongo_manager.db
