from typing import Any

from bson import ObjectId

from app.models.cluster import ClusterDocument
from app.repositories.base import BaseRepository


class ClusterRepository(BaseRepository):
    def __init__(self, db: Any) -> None:
        super().__init__(db, "clusters")

    async def insert_many(self, clusters: list[ClusterDocument]) -> list[ClusterDocument]:
        if not clusters:
            return []
        docs = [item.model_dump(by_alias=True, exclude_none=True) for item in clusters]
        result = await self.collection.insert_many(docs)
        for cluster, cluster_id in zip(clusters, result.inserted_ids, strict=False):
            cluster.id = cluster_id
        return clusters

    async def list_by_case(self, case_id: str) -> list[ClusterDocument]:
        cursor = self.collection.find({"case_id": ObjectId(case_id)}).sort("risk_score", -1)
        return [ClusterDocument(**row) async for row in cursor]
