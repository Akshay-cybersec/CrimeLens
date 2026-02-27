from typing import Any

from app.models.audit import AuditLogDocument
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository):
    def __init__(self, db: Any) -> None:
        super().__init__(db, "audit_logs")

    async def create(self, log: AuditLogDocument) -> None:
        await self.collection.insert_one(log.model_dump(by_alias=True, exclude_none=True))
