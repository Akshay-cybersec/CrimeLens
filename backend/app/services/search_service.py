from app.ai.embedding_service import EmbeddingService
from app.ai.llm_service import LLMService
from app.repositories.events import EventRepository
from app.schemas.analysis import SearchRequest, SearchResponse
from app.schemas.event import EventResponse
from app.vector.chroma_client import ChromaCloudStore


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
        query_embedding = await self.embedding_service.embed_text(payload.query)
        embedding_ids = await self.vector_store.query_events(query_embedding, case_id=case_id, top_k=payload.top_k)

        event_ids = [item.split(":", 1)[1] for item in embedding_ids if ":" in item]
        events = await self.event_repo.by_ids(event_ids) if event_ids else []

        context = [
            {
                "event_id": str(item.id),
                "type": item.event_type,
                "timestamp": item.timestamp.isoformat(),
                "raw_text": item.raw_text[:500],
            }
            for item in events
        ]
        llm_data = await self.llm_service.structured_json(
            task_prompt=(
                f"Interpret forensic query and explain why events match. Query: {payload.query}. "
                f"Candidate events: {context}"
            ),
            schema_hint={
                "interpreted_query": "string",
                "explanation": "string",
            },
        )

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
            for item in events
        ]

        return SearchResponse(
            interpreted_query=str(llm_data.get("interpreted_query", payload.query)),
            matching_events=matched_events,
            explanation=str(llm_data.get("explanation", "No explanation available.")),
        )
