from app.ai.embedding_service import EmbeddingService
from app.core.logging import get_logger
from app.repositories.cases import CaseRepository
from app.repositories.events import EventRepository
from app.vector.chroma_client import ChromaCloudStore

logger = get_logger(__name__)


class BackgroundWorkerService:
    def __init__(
        self,
        case_repo: CaseRepository,
        event_repo: EventRepository,
        embedding_service: EmbeddingService,
        vector_store: ChromaCloudStore,
    ) -> None:
        self.case_repo = case_repo
        self.event_repo = event_repo
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    async def process_case(self, case_id: str) -> None:
        events = await self.event_repo.all_by_case(case_id)
        for event in events:
            if event.id is None:
                continue
            embedding = await self.embedding_service.embed_text(event.raw_text)
            embedding_id = f"{case_id}:{event.id}"
            await self.vector_store.add_event_embedding(
                embedding_id=embedding_id,
                vector=embedding,
                case_id=case_id,
                event_type=event.event_type,
                metadata={"event_id": str(event.id)},
                document=event.raw_text,
            )
            await self.event_repo.upsert_embedding_ref(str(event.id), embedding_id)

        summary = "\n".join(event.raw_text for event in events[:200])
        case_embedding = await self.embedding_service.embed_text(summary or f"case-{case_id}")
        await self.vector_store.add_case_embedding(case_id=case_id, vector=case_embedding, summary=summary[:5000])

        await self.case_repo.update_timestamp(case_id)
        logger.info("background_case_processed", extra={"case_id": case_id, "events": len(events)})
