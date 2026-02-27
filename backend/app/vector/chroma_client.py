from __future__ import annotations

import asyncio
from typing import Any, Optional

import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection

from app.core.config import Settings
from app.utils.exceptions import APIException


class ChromaCloudStore:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._validate_settings()
        try:
            self._client: ClientAPI = chromadb.CloudClient(
                api_key=settings.chroma_api_key,
                tenant=settings.chroma_tenant,
                database=settings.chroma_database,
            )
        except Exception as exc:
            raise APIException(
                message="Unable to initialize Chroma Cloud client.",
                status_code=503,
                code="CHROMA_CLOUD_INIT_FAILED",
                details={"error": str(exc)},
            ) from exc
        self._events_collection_name = settings.chroma_collection_events
        self._cases_collection_name = settings.chroma_collection_cases
        self._event_collection: Optional[Collection] = None
        self._case_collection: Optional[Collection] = None

    def _validate_settings(self) -> None:
        if self._settings.vector_backend != "chromadb_cloud":
            raise APIException(
                message="Unsupported vector backend configured.",
                status_code=500,
                code="VECTOR_BACKEND_INVALID",
                details={"vector_backend": self._settings.vector_backend},
            )
        missing = [
            key
            for key, value in {
                "CHROMA_API_KEY": self._settings.chroma_api_key,
                "CHROMA_TENANT": self._settings.chroma_tenant,
                "CHROMA_DATABASE": self._settings.chroma_database,
            }.items()
            if not value
        ]
        if missing:
            raise APIException(
                message="Missing Chroma Cloud configuration.",
                status_code=500,
                code="CHROMA_CLOUD_CONFIG_MISSING",
                details={"missing": missing},
            )

    def get_collection(self, name: str) -> Collection:
        try:
            return self._client.get_or_create_collection(name=name)
        except Exception as exc:
            raise APIException(
                message=f"Failed to access Chroma collection '{name}'.",
                status_code=503,
                code="CHROMA_COLLECTION_ERROR",
                details={"collection": name, "error": str(exc)},
            ) from exc

    async def initialize(self) -> None:
        self._event_collection = await asyncio.to_thread(self.get_collection, self._events_collection_name)
        self._case_collection = await asyncio.to_thread(self.get_collection, self._cases_collection_name)

    def _events(self) -> Collection:
        if self._event_collection is None:
            self._event_collection = self.get_collection(self._events_collection_name)
        return self._event_collection

    def _cases(self) -> Collection:
        if self._case_collection is None:
            self._case_collection = self.get_collection(self._cases_collection_name)
        return self._case_collection

    async def add_event_embedding(
        self,
        embedding_id: str,
        vector: list[float],
        case_id: str,
        event_type: str,
        metadata: dict[str, Any],
        document: str,
    ) -> None:
        enriched_metadata = {**metadata, "case_id": case_id, "event_type": event_type}
        collection = self._events()
        try:
            await asyncio.to_thread(collection.delete, ids=[embedding_id])
            await asyncio.to_thread(
                collection.add,
                ids=[embedding_id],
                embeddings=[vector],
                metadatas=[enriched_metadata],
                documents=[document],
            )
        except Exception as exc:
            raise APIException(
                message="Failed to store event embedding in Chroma Cloud.",
                status_code=503,
                code="CHROMA_EVENT_ADD_FAILED",
                details={"embedding_id": embedding_id, "error": str(exc)},
            ) from exc

    async def query_events(self, query_vector: list[float], case_id: str, top_k: int) -> list[str]:
        collection = self._events()
        try:
            result = await asyncio.to_thread(
                collection.query,
                query_embeddings=[query_vector],
                n_results=20,
                where={"case_id": case_id},
            )
        except Exception as exc:
            raise APIException(
                message="Failed to query event embeddings from Chroma Cloud.",
                status_code=503,
                code="CHROMA_EVENT_QUERY_FAILED",
                details={"case_id": case_id, "error": str(exc)},
            ) from exc
        ids: list[list[str]] = result.get("ids", [[]])
        return (ids[0] if ids else [])[:top_k]

    async def add_case_embedding(self, case_id: str, vector: list[float], summary: str) -> None:
        collection = self._cases()
        try:
            await asyncio.to_thread(collection.delete, ids=[case_id])
            await asyncio.to_thread(
                collection.add,
                ids=[case_id],
                embeddings=[vector],
                metadatas=[{"case_id": case_id}],
                documents=[summary],
            )
        except Exception as exc:
            raise APIException(
                message="Failed to store case embedding in Chroma Cloud.",
                status_code=503,
                code="CHROMA_CASE_ADD_FAILED",
                details={"case_id": case_id, "error": str(exc)},
            ) from exc

    async def similar_cases(self, case_id: str, top_k: int) -> list[tuple[str, float]]:
        collection = self._cases()
        try:
            data = await asyncio.to_thread(collection.get, ids=[case_id], include=["embeddings"])
            emb: list[list[float]] = data.get("embeddings", [])
            if not emb:
                return []
            result = await asyncio.to_thread(collection.query, query_embeddings=emb, n_results=top_k + 1)
        except Exception as exc:
            raise APIException(
                message="Failed to compute similar cases from Chroma Cloud.",
                status_code=503,
                code="CHROMA_SIMILAR_QUERY_FAILED",
                details={"case_id": case_id, "error": str(exc)},
            ) from exc
        ids = result.get("ids", [[]])[0]
        distances = result.get("distances", [[]])[0]
        pairs: list[tuple[str, float]] = []
        for other_case_id, distance in zip(ids, distances, strict=False):
            if other_case_id == case_id:
                continue
            score = max(0.0, 1.0 - float(distance))
            pairs.append((other_case_id, score))
        return pairs[:top_k]
