from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from statistics import mean
from typing import Any, Optional

from bson import ObjectId
from fastapi import HTTPException, status

from app.ai.llm_service import LLMService
from app.core.config import Settings
from app.core.logging import get_logger
from app.models.event import EventDocument
from app.models.insight import InsightDocument
from app.repositories.events import EventRepository
from app.repositories.insight_repository import InsightRepository
from app.schemas.insight_schema import DetectedPattern, InsightResponse
from app.services.redis_service import RedisService

logger = get_logger(__name__)

INSIGHT_SYSTEM_PROMPT = (
    "You are a forensic investigative assistant. "
    "You provide probabilistic behavioral analysis only. "
    "You never determine guilt. "
    "You never make legal conclusions. "
    "Remain neutral and analytical. "
    "Return structured JSON only."
)

_case_locks: dict[str, asyncio.Lock] = {}


class InsightService:
    def __init__(
        self,
        event_repo: EventRepository,
        insight_repo: InsightRepository,
        llm_service: LLMService,
        redis_service: RedisService,
        settings: Settings,
    ) -> None:
        self.event_repo = event_repo
        self.insight_repo = insight_repo
        self.llm_service = llm_service
        self.redis_service = redis_service
        self.settings = settings

    async def get_or_generate(self, case_id: str) -> list[InsightResponse]:
        cached = await self._get_cached(case_id)
        if cached:
            return cached

        existing = await self.insight_repo.list_by_case(case_id)
        if existing:
            mapped = [self._to_response(item) for item in existing]
            await self._set_cached(case_id, mapped[0])
            return mapped

        return await self._generate(case_id=case_id, force=True)

    async def regenerate(self, case_id: str) -> InsightResponse:
        await self._check_regenerate_rate_limit(case_id)
        generated = await self._generate(case_id=case_id, force=True)
        if not generated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No events found for this case")
        await self._mark_regenerated(case_id)
        return generated[0]

    async def _generate(self, case_id: str, force: bool) -> list[InsightResponse]:
        lock = _case_locks.setdefault(case_id, asyncio.Lock())
        async with lock:
            if not force:
                existing = await self.insight_repo.list_by_case(case_id)
                if existing:
                    return [self._to_response(item) for item in existing]

            lock_key = f"insight:lock:{case_id}"
            lock_acquired = await self.redis_service.set_if_absent(lock_key, "1", ttl_seconds=30)
            if not lock_acquired:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Insight generation already in progress for this case",
                )
            try:
                events = await self.event_repo.all_by_case(case_id)
                if not events:
                    return []

                patterns = self._detect_patterns(events)
                summary_payload = self._build_summary(events, patterns)
                ai_result = await self._generate_ai(summary_payload)
                insight = self._build_insight_document(case_id, events, patterns, ai_result)
                saved = await self.insight_repo.create(insight)
                response = self._to_response(saved)
                await self._set_cached(case_id, response)

                logger.info(
                    "insight_generated",
                    extra={
                        "case_id": case_id,
                        "pattern_count": len(patterns),
                        "confidence_score": response.confidence_score,
                        "supporting_types": ai_result.get("supporting_types", []),
                    },
                )
                return [response]
            finally:
                await self.redis_service.delete_key(lock_key)

    def _detect_patterns(self, events: list[EventDocument]) -> list[DetectedPattern]:
        patterns: list[DetectedPattern] = []
        events_sorted = sorted(events, key=lambda item: item.timestamp)
        shutdown_events = [e for e in events_sorted if "shutdown" in e.raw_text.lower() or "power off" in e.raw_text.lower()]
        deletions = [e for e in events_sorted if e.event_type == "DELETION" or e.is_deleted]
        messages = [e for e in events_sorted if e.event_type == "MESSAGE"]
        calls = [e for e in events_sorted if e.event_type == "CALL"]
        locations = [e for e in events_sorted if e.event_type == "LOCATION"]

        deletion_before_shutdown = self._detect_deletion_before_shutdown(deletions, shutdown_events)
        if deletion_before_shutdown:
            patterns.append(deletion_before_shutdown)

        message_burst_gap = self._detect_message_burst_before_gap(messages, events_sorted)
        if message_burst_gap:
            patterns.append(message_burst_gap)

        location_jump = self._detect_location_jump(locations)
        if location_jump:
            patterns.append(location_jump)

        midnight_activity = self._detect_midnight_activity(events_sorted)
        if midnight_activity:
            patterns.append(midnight_activity)

        call_spike_shutdown = self._detect_call_spike_before_shutdown(calls, shutdown_events)
        if call_spike_shutdown:
            patterns.append(call_spike_shutdown)

        uninstall_after_suspicious = self._detect_uninstall_after_suspicious(events_sorted, patterns)
        if uninstall_after_suspicious:
            patterns.append(uninstall_after_suspicious)

        return patterns

    def _detect_deletion_before_shutdown(
        self,
        deletions: list[EventDocument],
        shutdown_events: list[EventDocument],
    ) -> Optional[DetectedPattern]:
        if not deletions or not shutdown_events:
            return None
        latest_deletion = max(deletions, key=lambda item: item.timestamp)
        earliest_shutdown = min(shutdown_events, key=lambda item: item.timestamp)
        delta_minutes = (earliest_shutdown.timestamp - latest_deletion.timestamp).total_seconds() / 60
        if 0 <= delta_minutes <= 180:
            return DetectedPattern(
                type="deletion_before_shutdown",
                related_event_ids=[str(latest_deletion.id), str(earliest_shutdown.id)],
                metadata_summary={"delta_minutes": round(delta_minutes, 2)},
            )
        return None

    def _detect_message_burst_before_gap(
        self,
        messages: list[EventDocument],
        events_sorted: list[EventDocument],
    ) -> Optional[DetectedPattern]:
        if len(messages) < 5 or len(events_sorted) < 2:
            return None
        burst_window = [item for item in messages if item.timestamp >= messages[-1].timestamp - timedelta(hours=1)]
        if len(burst_window) < 5:
            return None
        for idx in range(1, len(events_sorted)):
            gap = events_sorted[idx].timestamp - events_sorted[idx - 1].timestamp
            if gap >= timedelta(hours=6) and events_sorted[idx - 1].event_type == "MESSAGE":
                related_ids = [str(item.id) for item in burst_window[-5:] if item.id]
                related_ids.append(str(events_sorted[idx - 1].id))
                return DetectedPattern(
                    type="message_burst_before_inactivity_gap",
                    related_event_ids=related_ids,
                    metadata_summary={"message_count_last_hour": len(burst_window), "gap_hours": round(gap.total_seconds() / 3600, 2)},
                )
        return None

    def _detect_location_jump(self, locations: list[EventDocument]) -> Optional[DetectedPattern]:
        if len(locations) < 2:
            return None
        jumps = 0
        related_ids: list[str] = []
        for idx in range(1, len(locations)):
            current = locations[idx]
            previous = locations[idx - 1]
            delta = current.timestamp - previous.timestamp
            if delta <= timedelta(minutes=15):
                jumps += 1
                if current.id:
                    related_ids.append(str(current.id))
                if previous.id:
                    related_ids.append(str(previous.id))
        if jumps >= 2:
            return DetectedPattern(
                type="location_jump_anomaly",
                related_event_ids=list(dict.fromkeys(related_ids))[:10],
                metadata_summary={"jump_count": jumps, "max_interval_minutes": 15},
            )
        return None

    def _detect_midnight_activity(self, events_sorted: list[EventDocument]) -> Optional[DetectedPattern]:
        midnight_events = [item for item in events_sorted if item.timestamp.hour < 4]
        if len(midnight_events) < 5:
            return None
        return DetectedPattern(
            type="midnight_abnormal_activity",
            related_event_ids=[str(item.id) for item in midnight_events[:10] if item.id],
            metadata_summary={"midnight_event_count": len(midnight_events), "window": "00:00-03:59"},
        )

    def _detect_call_spike_before_shutdown(
        self,
        calls: list[EventDocument],
        shutdown_events: list[EventDocument],
    ) -> Optional[DetectedPattern]:
        if not calls or not shutdown_events:
            return None
        shutdown = min(shutdown_events, key=lambda item: item.timestamp)
        calls_before = [
            item
            for item in calls
            if timedelta(0) <= (shutdown.timestamp - item.timestamp) <= timedelta(hours=2)
        ]
        if len(calls_before) < 4:
            return None
        return DetectedPattern(
            type="call_spike_before_poweroff",
            related_event_ids=[str(item.id) for item in calls_before[:10] if item.id] + [str(shutdown.id)],
            metadata_summary={"call_count_before_shutdown": len(calls_before), "window_hours": 2},
        )

    def _detect_uninstall_after_suspicious(
        self,
        events_sorted: list[EventDocument],
        existing_patterns: list[DetectedPattern],
    ) -> Optional[DetectedPattern]:
        if not existing_patterns:
            return None
        suspicious_event_ids = {item_id for pattern in existing_patterns for item_id in pattern.related_event_ids}
        suspicious_events = [item for item in events_sorted if item.id and str(item.id) in suspicious_event_ids]
        if not suspicious_events:
            return None
        suspicious_latest = max(suspicious_events, key=lambda item: item.timestamp)
        uninstall_events = [
            item
            for item in events_sorted
            if ("uninstall" in item.raw_text.lower() or "removed app" in item.raw_text.lower())
            and timedelta(0) <= (item.timestamp - suspicious_latest.timestamp) <= timedelta(hours=2)
        ]
        if not uninstall_events:
            return None
        return DetectedPattern(
            type="app_uninstall_after_suspicious_event",
            related_event_ids=[str(suspicious_latest.id)] + [str(item.id) for item in uninstall_events[:5] if item.id],
            metadata_summary={"uninstall_events_detected": len(uninstall_events), "window_hours": 2},
        )

    def _build_summary(self, events: list[EventDocument], patterns: list[DetectedPattern]) -> dict[str, Any]:
        sorted_events = sorted(events, key=lambda item: item.timestamp)
        deletions = [item for item in sorted_events if item.event_type == "DELETION" or item.is_deleted]
        first_ts = sorted_events[0].timestamp
        last_ts = sorted_events[-1].timestamp
        duration_hours = max(1.0, (last_ts - first_ts).total_seconds() / 3600)
        event_type_counts: dict[str, int] = {}
        for event in sorted_events:
            event_type_counts[event.event_type] = event_type_counts.get(event.event_type, 0) + 1

        gaps: list[float] = []
        for idx in range(1, len(sorted_events)):
            gap_hours = (sorted_events[idx].timestamp - sorted_events[idx - 1].timestamp).total_seconds() / 3600
            gaps.append(gap_hours)

        return {
            "event_statistics": {
                "total_events": len(sorted_events),
                "event_type_counts": event_type_counts,
                "deletion_ratio": round(len(deletions) / max(1, len(sorted_events)), 4),
                "activity_density_per_hour": round(len(sorted_events) / duration_hours, 3),
            },
            "anomalies_detected": [pattern.model_dump() for pattern in patterns],
            "timeline_summary": {
                "start": first_ts.isoformat(),
                "end": last_ts.isoformat(),
                "duration_hours": round(duration_hours, 2),
                "avg_gap_hours": round(mean(gaps), 3) if gaps else 0.0,
                "max_gap_hours": round(max(gaps), 3) if gaps else 0.0,
            },
        }

    async def _generate_ai(self, summary_payload: dict[str, Any]) -> dict[str, Any]:
        llm_result = await self.llm_service.structured_json(
            task_prompt=(
                "Given the structured anomaly summary below, generate:\n"
                "- Insight summary (max 5 sentences)\n"
                "- Behavioral interpretation\n"
                "- Confidence score between 0 and 1\n"
                "- Supporting anomaly types\n"
                "Return strictly JSON:\n"
                '{"summary": "", "confidence_score": 0.0, "reasoning": "", "supporting_types": []}\n'
                f"Structured summary: {summary_payload}"
            ),
            schema_hint={
                "summary": "string",
                "confidence_score": "number between 0 and 1",
                "reasoning": "string",
                "supporting_types": "array of strings",
            },
            system_prompt=INSIGHT_SYSTEM_PROMPT,
            temperature=min(0.2, self.settings.deepinfra_temperature),
        )
        logger.info("insight_llm_response", extra={"response": llm_result})
        return llm_result

    def _build_insight_document(
        self,
        case_id: str,
        events: list[EventDocument],
        patterns: list[DetectedPattern],
        llm_result: dict[str, Any],
    ) -> InsightDocument:
        summary = str(llm_result.get("summary", "")).strip()
        if not summary:
            summary = "Behavioral anomalies detected from structured digital evidence signals."

        confidence_raw = llm_result.get("confidence_score", 0.45)
        try:
            confidence = float(confidence_raw)
        except (TypeError, ValueError):
            confidence = 0.45
        confidence = min(1.0, max(0.0, confidence))

        reasoning = str(llm_result.get("reasoning", "")).strip()
        if not reasoning:
            reasoning = "Probabilistic interpretation generated from rule-detected anomalies."

        supporting_type_candidates = llm_result.get("supporting_types", [])
        supporting_types = (
            [str(item) for item in supporting_type_candidates if isinstance(item, str)]
            if isinstance(supporting_type_candidates, list)
            else []
        )
        contradiction_type = ",".join(supporting_types[:4]) if supporting_types else (
            ",".join(pattern.type for pattern in patterns[:3]) if patterns else "no_strong_contradiction_detected"
        )

        pattern_event_ids = {
            item_id
            for pattern in patterns
            for item_id in pattern.related_event_ids
            if ObjectId.is_valid(item_id)
        }
        supporting_ids = [ObjectId(item_id) for item_id in list(pattern_event_ids)[:20]]

        return InsightDocument(
            case_id=ObjectId(case_id),
            summary=summary,
            supporting_event_ids=supporting_ids,
            contradiction_type=contradiction_type,
            confidence_score=confidence,
            ai_reasoning=reasoning,
            generated_by_model=self.settings.deepinfra_llm_model,
        )

    def _to_response(self, insight: InsightDocument) -> InsightResponse:
        return InsightResponse(
            id=str(insight.id),
            case_id=str(insight.case_id),
            summary=insight.summary,
            supporting_event_ids=[str(item) for item in insight.supporting_event_ids],
            contradiction_type=insight.contradiction_type,
            confidence_score=insight.confidence_score,
            ai_reasoning=insight.ai_reasoning,
            created_at=insight.created_at,
            generated_by_model=insight.generated_by_model,
        )

    async def _check_regenerate_rate_limit(self, case_id: str) -> None:
        cooldown = self.settings.insight_regenerate_cooldown_seconds
        key = f"insight:regen:last:{case_id}"
        if self.redis_service.client is not None:
            existing = await self.redis_service.client.get(key)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Insight regeneration is rate limited for this case",
                )
            return

        last_generated = await self.insight_repo.last_generated_at(case_id)
        if last_generated is None:
            return
        if datetime.now(timezone.utc) - last_generated < timedelta(seconds=cooldown):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Insight regeneration is rate limited for this case",
            )

    async def _mark_regenerated(self, case_id: str) -> None:
        cooldown = self.settings.insight_regenerate_cooldown_seconds
        await self.redis_service.set_if_absent(
            key=f"insight:regen:last:{case_id}",
            value=str(int(datetime.now(timezone.utc).timestamp())),
            ttl_seconds=cooldown,
        )

    async def _get_cached(self, case_id: str) -> list[InsightResponse]:
        cached = await self.redis_service.get_json(f"insight:case:{case_id}:latest")
        if not cached:
            return []
        try:
            return [InsightResponse(**cached)]
        except Exception:
            return []

    async def _set_cached(self, case_id: str, insight: InsightResponse) -> None:
        await self.redis_service.set_json(
            key=f"insight:case:{case_id}:latest",
            value=insight.model_dump(mode="json"),
            ttl_seconds=self.settings.insight_cache_ttl_seconds,
        )
