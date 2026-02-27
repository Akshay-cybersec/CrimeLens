from typing import Any

from fastapi import Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.embedding_service import EmbeddingService
from app.ai.llm_service import LLMService
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.repositories.audits import AuditRepository
from app.repositories.cases import CaseRepository
from app.repositories.clusters import ClusterRepository
from app.repositories.events import EventRepository
from app.repositories.insights import InsightRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.background_worker import BackgroundWorkerService
from app.services.case_behavior_service import CaseBehaviorService
from app.services.case_service import CaseService
from app.services.evidence_service import EvidenceService
from app.services.insight_service import InsightService
from app.services.redis_service import RedisService
from app.services.search_service import SearchService
from app.services.similar_case_service import SimilarCaseService
from app.services.timeline_service import TimelineService
from app.services.ufdr_parser import UFDRParserService
from app.vector.chroma_client import ChromaCloudStore


def get_app_settings() -> Settings:
    return get_settings()


def get_redis_service(request: Request) -> RedisService:
    return request.app.state.redis_service


def get_vector_store(request: Request) -> ChromaCloudStore:
    return request.app.state.vector_store


def get_user_repository(db: AsyncIOMotorDatabase[Any] = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_auth_service(
    users_repo: UserRepository = Depends(get_user_repository),
    settings: Settings = Depends(get_app_settings),
) -> AuthService:
    return AuthService(users_repo, settings)


def get_case_repository(db: AsyncIOMotorDatabase[Any] = Depends(get_db)) -> CaseRepository:
    return CaseRepository(db)


def get_event_repository(db: AsyncIOMotorDatabase[Any] = Depends(get_db)) -> EventRepository:
    return EventRepository(db)


def get_cluster_repository(db: AsyncIOMotorDatabase[Any] = Depends(get_db)) -> ClusterRepository:
    return ClusterRepository(db)


def get_insight_repository(db: AsyncIOMotorDatabase[Any] = Depends(get_db)) -> InsightRepository:
    return InsightRepository(db)


def get_audit_repository(db: AsyncIOMotorDatabase[Any] = Depends(get_db)) -> AuditRepository:
    return AuditRepository(db)


def get_embedding_service(settings: Settings = Depends(get_app_settings)) -> EmbeddingService:
    return EmbeddingService(settings)


def get_llm_service(settings: Settings = Depends(get_app_settings)) -> LLMService:
    return LLMService(settings)


def get_parser_service() -> UFDRParserService:
    return UFDRParserService()


def get_case_service(
    case_repo: CaseRepository = Depends(get_case_repository),
    event_repo: EventRepository = Depends(get_event_repository),
    parser_service: UFDRParserService = Depends(get_parser_service),
    redis_service: RedisService = Depends(get_redis_service),
    settings: Settings = Depends(get_app_settings),
) -> CaseService:
    return CaseService(
        case_repo=case_repo,
        event_repo=event_repo,
        parser_service=parser_service,
        redis_service=redis_service,
        max_upload_size_mb=settings.max_upload_size_mb,
    )


def get_timeline_service(
    event_repo: EventRepository = Depends(get_event_repository),
) -> TimelineService:
    return TimelineService(event_repo)


def get_evidence_service(
    event_repo: EventRepository = Depends(get_event_repository),
    cluster_repo: ClusterRepository = Depends(get_cluster_repository),
) -> EvidenceService:
    return EvidenceService(event_repo, cluster_repo)


def get_search_service(
    event_repo: EventRepository = Depends(get_event_repository),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    llm_service: LLMService = Depends(get_llm_service),
    vector_store: ChromaCloudStore = Depends(get_vector_store),
) -> SearchService:
    return SearchService(
        event_repo=event_repo,
        embedding_service=embedding_service,
        llm_service=llm_service,
        vector_store=vector_store,
    )


def get_insight_service(
    event_repo: EventRepository = Depends(get_event_repository),
    insight_repo: InsightRepository = Depends(get_insight_repository),
    llm_service: LLMService = Depends(get_llm_service),
) -> InsightService:
    return InsightService(event_repo, insight_repo, llm_service)


def get_case_behavior_service(
    case_repo: CaseRepository = Depends(get_case_repository),
    event_repo: EventRepository = Depends(get_event_repository),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    vector_store: ChromaCloudStore = Depends(get_vector_store),
    redis_service: RedisService = Depends(get_redis_service),
    llm_service: LLMService = Depends(get_llm_service),
    settings: Settings = Depends(get_app_settings),
) -> CaseBehaviorService:
    return CaseBehaviorService(
        case_repo=case_repo,
        event_repo=event_repo,
        embedding_service=embedding_service,
        vector_store=vector_store,
        redis_service=redis_service,
        llm_service=llm_service,
        settings=settings,
    )


def get_similar_case_service(
    case_behavior_service: CaseBehaviorService = Depends(get_case_behavior_service),
) -> SimilarCaseService:
    return SimilarCaseService(case_behavior_service)


def get_background_worker(
    case_repo: CaseRepository = Depends(get_case_repository),
    event_repo: EventRepository = Depends(get_event_repository),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    vector_store: ChromaCloudStore = Depends(get_vector_store),
    case_behavior_service: CaseBehaviorService = Depends(get_case_behavior_service),
) -> BackgroundWorkerService:
    return BackgroundWorkerService(
        case_repo=case_repo,
        event_repo=event_repo,
        embedding_service=embedding_service,
        vector_store=vector_store,
        case_behavior_service=case_behavior_service,
    )
