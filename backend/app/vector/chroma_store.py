from typing import Any

import chromadb

from app.core.config import Settings


class ChromaStore:
    def __init__(self, settings: Settings) -> None:
        self._client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        self._collection = self._client.get_or_create_collection(name="forensic_events")
        self._case_collection = self._client.get_or_create_collection(name="forensic_cases")

    async def upsert_event_embedding(
        self, embedding_id: str, vector: list[float], metadata: dict[str, Any], document: str
    ) -> None:
        self._collection.upsert(
            ids=[embedding_id],
            embeddings=[vector],
            metadatas=[metadata],
            documents=[document],
        )

    async def query_events(self, query_vector: list[float], case_id: str, top_k: int) -> list[str]:
        result = self._collection.query(
            query_embeddings=[query_vector],
            n_results=top_k,
            where={"case_id": case_id},
        )
        ids: list[list[str]] = result.get("ids", [[]])
        return ids[0] if ids else []

    async def upsert_case_embedding(self, case_id: str, vector: list[float], summary: str) -> None:
        self._case_collection.upsert(
            ids=[case_id],
            embeddings=[vector],
            metadatas=[{"case_id": case_id}],
            documents=[summary],
        )

    async def similar_cases(self, case_id: str, top_k: int) -> list[tuple[str, float]]:
        data = self._case_collection.get(ids=[case_id], include=["embeddings"])
        emb: list[list[float]] = data.get("embeddings", [])
        if not emb:
            return []
        result = self._case_collection.query(query_embeddings=emb, n_results=top_k + 1)
        ids = result.get("ids", [[]])[0]
        distances = result.get("distances", [[]])[0]
        pairs: list[tuple[str, float]] = []
        for cid, dist in zip(ids, distances, strict=False):
            if cid == case_id:
                continue
            score = max(0.0, 1.0 - float(dist))
            pairs.append((cid, score))
        return pairs[:top_k]
