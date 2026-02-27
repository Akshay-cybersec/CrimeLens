from __future__ import annotations

import re
from typing import Any

from app.ai.embedding_service import EmbeddingService
from app.core.logging import get_logger
from app.models.event import EventDocument
from app.ai.llm_service import LLMService
from app.repositories.events import EventRepository
from app.schemas.analysis import SearchRequest, SearchResponse
from app.schemas.event import EventResponse
from app.vector.chroma_client import ChromaCloudStore

logger = get_logger(__name__)


class SearchService:
    def __init__(
        self,
        event_repo: EventRepository,
        embedding_service: EmbeddingService,
        llm_service: LLMService,
        vector_store: ChromaCloudStore,
    ) -> None:
        self.event_repo = event_repo
        self.embedding_service = embedding_service
        self.llm_service = llm_service
        self.vector_store = vector_store

    async def semantic_search(self, case_id: str, payload: SearchRequest) -> SearchResponse:
        hints = self._extract_hints(payload.query)
        case_events = await self.event_repo.all_by_case(case_id)
        matched = self._filter_events(case_events, payload.query, hints)
        matched_map: dict[str, EventDocument] = {str(item.id): item for item in matched if item.id}

        # Expand with embedding search so broad NL queries still work.
        if len(matched_map) < payload.top_k:
            vector_events = await self._vector_candidates(case_id, payload.query, payload.top_k * 2)
            for event in vector_events:
                if event.id is not None:
                    matched_map[str(event.id)] = event

        matched_events_sorted = sorted(matched_map.values(), key=lambda item: item.timestamp)[: payload.top_k]
        llm_data = await self._build_reasoning(payload.query, matched_events_sorted, hints)

        matched_events = [
            EventResponse(
                id=str(item.id),
                case_id=str(item.case_id),
                event_type=item.event_type,
                timestamp=item.timestamp,
                metadata=item.metadata,
                raw_text=item.raw_text,
                is_deleted=item.is_deleted,
            )
            for item in matched_events_sorted
        ]

        return SearchResponse(
            interpreted_query=str(llm_data.get("interpreted_query", payload.query)),
            matching_events=matched_events,
            explanation=str(llm_data.get("explanation", "No explanation available.")),
        )

    async def _vector_candidates(self, case_id: str, query: str, top_k: int) -> list[EventDocument]:
        try:
            query_embedding = await self.embedding_service.embed_text(query)
            embedding_ids = await self.vector_store.query_events(query_embedding, case_id=case_id, top_k=top_k)
            event_ids = [item.split(":", 1)[1] for item in embedding_ids if ":" in item]
            return await self.event_repo.by_ids(event_ids) if event_ids else []
        except Exception as exc:
            logger.warning("semantic_search_vector_fallback", extra={"case_id": case_id, "error": str(exc)})
            return []

    async def _build_reasoning(
        self,
        query: str,
        matched_events: list[EventDocument],
        hints: dict[str, Any],
    ) -> dict[str, Any]:
        if not matched_events:
            return {
                "interpreted_query": query,
                "explanation": "No matching events were found in this case for the requested behavioral pattern.",
            }

        context = [
            {
                "event_id": str(item.id),
                "type": item.event_type,
                "timestamp": item.timestamp.isoformat(),
                "raw_text": item.raw_text[:260],
            }
            for item in matched_events[:25]
        ]
        try:
            llm_data = await self.llm_service.structured_json(
                task_prompt=(
                    "Interpret this investigator query and explain the matched forensic events in neutral language.\n"
                    "Query: "
                    f"{query}\n"
                    "Query hints: "
                    f"{hints}\n"
                    "Matched events: "
                    f"{context}\n"
                    "Return JSON with interpreted_query and explanation only."
                ),
                schema_hint={
                    "interpreted_query": "string",
                    "explanation": "string",
                },
                temperature=0.1,
            )
            if isinstance(llm_data, dict):
                return llm_data
        except Exception as exc:
            logger.warning("semantic_search_reasoning_fallback", extra={"error": str(exc)})

        type_counts: dict[str, int] = {}
        for event in matched_events:
            type_counts[event.event_type] = type_counts.get(event.event_type, 0) + 1
        return {
            "interpreted_query": query,
            "explanation": (
                f"Matched {len(matched_events)} events based on query intent. "
                f"Event type distribution: {type_counts}. "
                "Results were ranked by combined query-intent filtering and semantic similarity."
            ),
        }

    def _extract_hints(self, query: str) -> dict[str, Any]:
        lower = query.lower()
        event_types: list[str] = []
        if any(term in lower for term in ["call", "calls", "phone call", "incoming", "outgoing"]):
            event_types.append("CALL")
        if any(term in lower for term in ["message", "whatsapp", "telegram", "sms", "chat", "text"]):
            event_types.append("MESSAGE")
        if any(term in lower for term in ["location", "gps", "tower", "movement", "route"]):
            event_types.append("LOCATION")
        if any(term in lower for term in ["delete", "deleted", "erase", "uninstall", "removed"]):
            event_types.append("DELETION")

        platform_terms = [name for name in ["whatsapp", "telegram", "sms", "upi"] if name in lower]
        direction = ""
        if "incoming" in lower:
            direction = "incoming"
        elif "outgoing" in lower or "made to" in lower or "sent to" in lower:
            direction = "outgoing"

        contact = ""
        # give me all calls made to x person / from x person / to Manish
        patterns = [
            r"(?:to|from)\s+([a-z][a-z0-9 ._-]{1,40})",
            r"(?:contact|person|name)\s+([a-z][a-z0-9 ._-]{1,40})",
        ]
        for pattern in patterns:
            match = re.search(pattern, lower)
            if match:
                contact = match.group(1).strip()
                break

        return {
            "event_types": list(dict.fromkeys(event_types)),
            "platform_terms": platform_terms,
            "direction": direction,
            "contact": contact,
        }

    def _filter_events(
        self,
        events: list[EventDocument],
        query: str,
        hints: dict[str, Any],
    ) -> list[EventDocument]:
        query_terms = [term for term in re.split(r"\W+", query.lower()) if len(term) >= 3]
        event_types = set(hints.get("event_types", []))
        platforms = [item.lower() for item in hints.get("platform_terms", [])]
        direction = str(hints.get("direction", "")).lower()
        contact = str(hints.get("contact", "")).strip().lower()
        filtered: list[EventDocument] = []

        for event in events:
            raw = event.raw_text.lower()
            if event_types and event.event_type not in event_types:
                continue
            if platforms and not any(platform in raw for platform in platforms):
                continue
            if direction and direction not in raw:
                continue
            if contact and contact not in raw:
                continue

            if query_terms:
                overlap = sum(1 for term in query_terms if term in raw)
                if overlap == 0 and not event_types and not platforms and not contact:
                    continue
            filtered.append(event)

        return filtered
