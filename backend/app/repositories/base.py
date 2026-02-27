from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase


class BaseRepository:
    def __init__(self, db: AsyncIOMotorDatabase[Any], collection_name: str) -> None:
        self.collection: AsyncIOMotorCollection[Any] = db[collection_name]
