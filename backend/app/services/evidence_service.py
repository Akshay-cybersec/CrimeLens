from datetime import timedelta

from app.models.cluster import ClusterDocument
from app.repositories.clusters import ClusterRepository
from app.repositories.events import EventRepository
from app.schemas.analysis import EvidenceAnalysisResponse, EvidenceClusterResponse


class EvidenceService:
    def __init__(self, event_repo: EventRepository, cluster_repo: ClusterRepository) -> None:
        self.event_repo = event_repo
        self.cluster_repo = cluster_repo

    async def analyze(self, case_id: str) -> EvidenceAnalysisResponse:
        events = await self.event_repo.all_by_case(case_id)
        clusters: list[ClusterDocument] = []

        deletions = [e for e in events if e.event_type == "DELETION" or e.is_deleted]
        messaging = [e for e in events if e.event_type == "MESSAGE"]
        locations = [e for e in events if e.event_type == "LOCATION"]
        app_usage = [e for e in events if e.event_type == "APP_USAGE"]
        shutdowns = [e for e in events if "shutdown" in e.raw_text.lower()]

        if deletions and shutdowns:
            latest_deletion = max(deletions, key=lambda x: x.timestamp)
            first_shutdown = min(shutdowns, key=lambda x: x.timestamp)
            if first_shutdown.timestamp - latest_deletion.timestamp < timedelta(hours=3):
                clusters.append(
                    ClusterDocument(
                        case_id=latest_deletion.case_id,
                        risk_score=0.82,
                        related_event_ids=[latest_deletion.id, first_shutdown.id],
                        anomaly_type="sudden_deletion_before_inactivity",
                        reasoning="Deletion artifacts closely precede device shutdown event.",
                    )
                )

        if len(messaging) >= 25:
            clusters.append(
                ClusterDocument(
                    case_id=messaging[0].case_id,
                    risk_score=0.66,
                    related_event_ids=[item.id for item in messaging[:20] if item.id],
                    anomaly_type="high_frequency_messaging_burst",
                    reasoning="Unusually high messaging volume detected in compressed window.",
                )
            )

        if len(locations) >= 8:
            clusters.append(
                ClusterDocument(
                    case_id=locations[0].case_id,
                    risk_score=0.59,
                    related_event_ids=[item.id for item in locations[:12] if item.id],
                    anomaly_type="rapid_location_change",
                    reasoning="Frequent location transitions suggest anomalous movement behavior.",
                )
            )

        if shutdowns and len(app_usage) >= 10:
            shutdown = shutdowns[0]
            pre_shutdown_usage = [
                item for item in app_usage if 0 <= (shutdown.timestamp - item.timestamp).total_seconds() <= 7200
            ]
            if len(pre_shutdown_usage) >= 5:
                clusters.append(
                    ClusterDocument(
                        case_id=shutdown.case_id,
                        risk_score=0.71,
                        related_event_ids=[item.id for item in pre_shutdown_usage if item.id],
                        anomaly_type="app_usage_spike_before_shutdown",
                        reasoning="Application interactions increase significantly before shutdown.",
                    )
                )

        persisted = await self.cluster_repo.insert_many(clusters)
        response_clusters = [
            EvidenceClusterResponse(
                id=str(item.id),
                risk_score=item.risk_score,
                related_event_ids=[str(eid) for eid in item.related_event_ids],
                anomaly_type=item.anomaly_type,
                reasoning=item.reasoning,
            )
            for item in persisted
        ]
        return EvidenceAnalysisResponse(case_id=case_id, clusters=response_clusters)
