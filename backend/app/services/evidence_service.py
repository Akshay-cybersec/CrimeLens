from __future__ import annotations

from datetime import timedelta
from statistics import mean
from typing import Optional

from app.models.cluster import ClusterDocument
from app.models.event import EventDocument
from app.repositories.clusters import ClusterRepository
from app.repositories.events import EventRepository
from app.schemas.analysis import EvidenceAnalysisResponse, EvidenceClusterResponse
from app.schemas.event import EventResponse


class EvidenceService:
    def __init__(self, event_repo: EventRepository, cluster_repo: ClusterRepository) -> None:
        self.event_repo = event_repo
        self.cluster_repo = cluster_repo

    async def analyze(self, case_id: str) -> EvidenceAnalysisResponse:
        events = await self.event_repo.all_by_case(case_id)
        if not events:
            return EvidenceAnalysisResponse(case_id=case_id, clusters=[])

        clusters: list[ClusterDocument] = []
        sorted_events = sorted(events, key=lambda item: item.timestamp)
        deletions = [e for e in sorted_events if e.event_type == "DELETION" or e.is_deleted]
        messaging = [e for e in sorted_events if e.event_type == "MESSAGE"]
        calls = [e for e in sorted_events if e.event_type == "CALL"]
        locations = [e for e in sorted_events if e.event_type == "LOCATION"]
        shutdowns = [e for e in sorted_events if self._contains_any(e.raw_text, ("shutdown", "power_off", "device_power_off", "power off"))]

        deletion_cluster = self._detect_sudden_deletion_cluster(deletions, sorted_events)
        if deletion_cluster:
            clusters.append(deletion_cluster)

        inactivity_cluster = self._detect_inactivity_gap_cluster(sorted_events)
        if inactivity_cluster:
            clusters.append(inactivity_cluster)

        communication_cluster = self._detect_message_call_burst_cluster(messaging, calls, shutdowns, sorted_events)
        if communication_cluster:
            clusters.append(communication_cluster)

        location_cluster = self._detect_location_anomaly_cluster(locations)
        if location_cluster:
            clusters.append(location_cluster)

        cleanup_cluster = self._detect_cleanup_after_suspicious_cluster(sorted_events)
        if cleanup_cluster:
            clusters.append(cleanup_cluster)

        persisted = await self.cluster_repo.replace_for_case(case_id, clusters)
        event_map = {str(item.id): item for item in sorted_events if item.id}
        response_clusters = [
            EvidenceClusterResponse(
                id=str(item.id),
                risk_score=item.risk_score,
                related_event_ids=[str(eid) for eid in item.related_event_ids],
                related_events=self._as_event_responses(item.related_event_ids, event_map),
                anomaly_type=item.anomaly_type,
                reasoning=item.reasoning,
            )
            for item in persisted
        ]
        return EvidenceAnalysisResponse(case_id=case_id, clusters=response_clusters)

    def _detect_sudden_deletion_cluster(
        self,
        deletions: list[EventDocument],
        events: list[EventDocument],
    ) -> Optional[ClusterDocument]:
        if not deletions:
            return None
        candidate = deletions[-1]
        nearby = self._events_within_window(events, candidate.timestamp, before=timedelta(hours=2), after=timedelta(minutes=45))
        if len(nearby) < 3:
            return None
        reason = "Sudden deletion activity detected with tightly grouped surrounding digital events."
        return self._build_cluster(candidate.case_id, 0.84, "sudden_deletion_activity", reason, nearby[:10])

    def _detect_inactivity_gap_cluster(self, events: list[EventDocument]) -> Optional[ClusterDocument]:
        if len(events) < 2:
            return None
        gaps: list[timedelta] = []
        largest_gap = timedelta(0)
        left_idx = 0
        for idx in range(1, len(events)):
            gap = events[idx].timestamp - events[idx - 1].timestamp
            gaps.append(gap)
            if gap > largest_gap:
                largest_gap = gap
                left_idx = idx - 1
        avg_gap_seconds = mean(g.total_seconds() for g in gaps) if gaps else 0.0
        if largest_gap.total_seconds() < max(6 * 3600, avg_gap_seconds * 2.8):
            return None
        left_event = events[left_idx]
        right_event = events[left_idx + 1]
        related = [left_event, right_event]
        reason = (
            f"Extended inactivity window of {round(largest_gap.total_seconds() / 3600, 2)} hours "
            "between adjacent events suggests potential data suppression or device inactivity."
        )
        return self._build_cluster(left_event.case_id, 0.73, "inactivity_gap_anomaly", reason, related)

    def _detect_message_call_burst_cluster(
        self,
        messaging: list[EventDocument],
        calls: list[EventDocument],
        shutdowns: list[EventDocument],
        events: list[EventDocument],
    ) -> Optional[ClusterDocument]:
        signal_events = sorted(messaging + calls, key=lambda item: item.timestamp)
        if len(signal_events) < 4:
            return None

        if shutdowns:
            anchor = min(shutdowns, key=lambda item: item.timestamp)
            window_events = [
                event
                for event in signal_events
                if timedelta(0) <= (anchor.timestamp - event.timestamp) <= timedelta(hours=2)
            ]
            if len(window_events) >= 3:
                related = window_events + [anchor]
                reason = "Message/call burst observed in the two-hour window before device power-off."
                return self._build_cluster(anchor.case_id, 0.78, "communication_burst_before_poweroff", reason, related[:12])

        # Fallback burst detection without shutdown anchor.
        for idx in range(len(signal_events)):
            start = signal_events[idx].timestamp
            window = [
                event
                for event in signal_events
                if timedelta(0) <= (event.timestamp - start) <= timedelta(minutes=45)
            ]
            if len(window) >= 5:
                reason = "High-volume communication activity detected in a compressed time window."
                return self._build_cluster(window[0].case_id, 0.69, "communication_burst_anomaly", reason, window[:12])
        return None

    def _detect_location_anomaly_cluster(self, locations: list[EventDocument]) -> Optional[ClusterDocument]:
        if len(locations) < 3:
            return None
        related: list[EventDocument] = []
        for idx in range(1, len(locations)):
            gap = locations[idx].timestamp - locations[idx - 1].timestamp
            if gap <= timedelta(minutes=25):
                related.extend([locations[idx - 1], locations[idx]])
        deduped = self._dedupe_events(related)
        if len(deduped) < 3:
            return None
        reason = "Rapid location transitions detected over short intervals, indicating movement anomaly."
        return self._build_cluster(deduped[0].case_id, 0.67, "rapid_location_transition", reason, deduped[:12])

    def _detect_cleanup_after_suspicious_cluster(self, events: list[EventDocument]) -> Optional[ClusterDocument]:
        suspicious = [
            event
            for event in events
            if self._contains_any(event.raw_text, ("power_off", "shutdown", "factory_reset", "uninstall", "deleted"))
        ]
        if len(suspicious) < 2:
            return None
        suspicious = sorted(suspicious, key=lambda item: item.timestamp)
        anchor = suspicious[0]
        followups = [
            event for event in suspicious[1:] if timedelta(0) <= (event.timestamp - anchor.timestamp) <= timedelta(hours=8)
        ]
        if not followups:
            return None
        related = [anchor] + followups
        reason = "Potential anti-forensic cleanup pattern detected (shutdown/reset/deletion sequence)."
        return self._build_cluster(anchor.case_id, 0.8, "post_incident_cleanup_sequence", reason, related[:10])

    def _events_within_window(
        self,
        events: list[EventDocument],
        center,
        before: timedelta,
        after: timedelta,
    ) -> list[EventDocument]:
        return [
            event
            for event in events
            if -before <= (event.timestamp - center) <= after
        ]

    def _build_cluster(
        self,
        case_id,
        risk_score: float,
        anomaly_type: str,
        reasoning: str,
        related_events: list[EventDocument],
    ) -> ClusterDocument:
        related_ids = [event.id for event in self._dedupe_events(related_events) if event.id is not None]
        return ClusterDocument(
            case_id=case_id,
            risk_score=max(0.0, min(1.0, risk_score)),
            related_event_ids=related_ids,
            anomaly_type=anomaly_type,
            reasoning=reasoning,
        )

    def _as_event_responses(
        self,
        event_ids: list,
        event_map: dict[str, EventDocument],
    ) -> list[EventResponse]:
        rows: list[EventResponse] = []
        for event_id in event_ids:
            key = str(event_id)
            event = event_map.get(key)
            if event is None:
                continue
            rows.append(
                EventResponse(
                    id=str(event.id),
                    case_id=str(event.case_id),
                    event_type=event.event_type,
                    timestamp=event.timestamp,
                    metadata=event.metadata,
                    raw_text=event.raw_text,
                    is_deleted=event.is_deleted,
                )
            )
        return rows

    def _dedupe_events(self, events: list[EventDocument]) -> list[EventDocument]:
        seen: set[str] = set()
        deduped: list[EventDocument] = []
        for event in events:
            key = str(event.id) if event.id is not None else f"{event.event_type}:{event.timestamp.isoformat()}:{event.raw_text[:40]}"
            if key in seen:
                continue
            seen.add(key)
            deduped.append(event)
        return deduped

    def _contains_any(self, text: str, needles: tuple[str, ...]) -> bool:
        lower = text.lower()
        return any(item in lower for item in needles)
