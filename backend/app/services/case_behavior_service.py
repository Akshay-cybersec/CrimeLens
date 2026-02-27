from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

from fastapi import HTTPException, status

from app.ai.embedding_service import EmbeddingService
from app.ai.llm_service import LLMService
from app.core.config import Settings
from app.core.logging import get_logger
from app.repositories.cases import CaseRepository
from app.repositories.events import EventRepository
from app.schemas.analysis import BehavioralIndexResponse, SimilarCaseResponse
from app.services.redis_service import RedisService
from app.vector.chroma_client import ChromaCloudStore

logger = get_logger(__name__)

SIMILARITY_SYSTEM_PROMPT = (
    "You are a forensic pattern analysis assistant. "
    "Explain behavioral similarity without making legal conclusions. "
    "Return concise structured JSON."
)


class CaseBehaviorService:
    def __init__(
        self,
        case_repo: CaseRepository,
        event_repo: EventRepository,
        embedding_service: EmbeddingService,
        vector_store: ChromaCloudStore,
        redis_service: RedisService,
        llm_service: LLMService,
        settings: Settings,
    ) -> None:
        self.case_repo = case_repo
        self.event_repo = event_repo
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.redis_service = redis_service
        self.llm_service = llm_service
        self.settings = settings

    async def extract_behavioral_features(self, case_id: str) -> dict[str, Any]:
        events = await self.event_repo.all_by_case(case_id)
        incident_time = self._infer_incident_time(events)

        comm_events = [e for e in events if e.event_type in {"CALL", "MESSAGE", "DELETION"}]
        location_events = [e for e in events if e.event_type == "LOCATION"]
        system_events = [e for e in events if e.event_type == "SYSTEM"]

        calls_before = [
            e
            for e in events
            if e.event_type == "CALL"
            and timedelta(0) <= (incident_time - e.timestamp) <= timedelta(hours=2)
        ]
        messages_before = [
            e
            for e in events
            if e.event_type == "MESSAGE"
            and timedelta(0) <= (incident_time - e.timestamp) <= timedelta(hours=1)
        ]
        deleted_messages = [
            e
            for e in comm_events
            if e.event_type == "DELETION" or ("delete" in e.raw_text.lower() and "message" in e.raw_text.lower())
        ]

        post_incident_locations = [
            e
            for e in location_events
            if timedelta(0) <= (e.timestamp - incident_time) <= timedelta(hours=2)
        ]
        post_incident_shutdown = any(
            timedelta(0) <= (e.timestamp - incident_time) <= timedelta(hours=2)
            and ("shutdown" in e.raw_text.lower() or "power off" in e.raw_text.lower())
            for e in system_events
        )
        factory_reset_attempt = any(
            "factory reset" in e.raw_text.lower() or "wipe device" in e.raw_text.lower()
            for e in events
        )

        transaction_events = [
            e for e in events if re.search(r"\b(transaction|payment|transfer|withdrawal)\b", e.raw_text.lower())
        ]
        large_transactions = [
            e
            for e in transaction_events
            if timedelta(0) <= (e.timestamp - incident_time) <= timedelta(hours=24)
            and re.search(r"\b(large|high|big|significant|over)\b", e.raw_text.lower())
        ]
        flagged_transactions = [
            e for e in transaction_events if re.search(r"\b(flagged|suspicious|fraud|alert)\b", e.raw_text.lower())
        ]

        deleted_media = [
            e
            for e in events
            if re.search(r"\b(deleted photo|deleted video|deleted media|gallery removed)\b", e.raw_text.lower())
        ]

        co_suspect_communication = any(
            re.search(r"\b(co-?suspect|accomplice|associate)\b", e.raw_text.lower()) for e in comm_events
        )
        location_at_crime_scene = any(
            re.search(r"\b(crime scene|incident location|scene)\b", e.raw_text.lower()) for e in location_events
        )
        night_activity = any(e.timestamp.hour < 4 for e in events)

        features = {
            "call_spike_before_incident": len(calls_before) >= 4,
            "message_burst_before_incident": len(messages_before) >= 8,
            "deleted_messages_count": len(deleted_messages),
            "communication_with_co_suspect": co_suspect_communication,
            "location_at_crime_scene": location_at_crime_scene,
            "rapid_post_crime_movement": len(post_incident_locations) >= 3,
            "night_activity_detected": night_activity,
            "large_transaction_after_incident": len(large_transactions) > 0,
            "flagged_transaction_count": len(flagged_transactions),
            "device_shutdown_after_incident": post_incident_shutdown,
            "factory_reset_attempt": factory_reset_attempt,
            "deleted_media_count": len(deleted_media),
        }
        return {"case_id": case_id, "behavioral_features": features}

    def build_behavioral_summary(self, features: dict[str, Any]) -> str:
        values = features.get("behavioral_features", {})
        lines: list[str] = []

        if values.get("call_spike_before_incident"):
            lines.append("Communication spike detected before incident window.")
        if values.get("message_burst_before_incident"):
            lines.append("Message burst observed shortly before incident.")
        if int(values.get("deleted_messages_count", 0)) > 0:
            lines.append(f"Deleted messages detected: {int(values.get('deleted_messages_count', 0))}.")
        if values.get("communication_with_co_suspect"):
            lines.append("Communication links indicate possible co-suspect interaction.")
        if values.get("location_at_crime_scene"):
            lines.append("Location traces indicate presence at the crime scene.")
        if values.get("rapid_post_crime_movement"):
            lines.append("Rapid geographic movement detected after incident.")
        if values.get("night_activity_detected"):
            lines.append("Notable activity detected during night hours.")
        if values.get("large_transaction_after_incident"):
            lines.append("Large post-incident financial transaction detected.")
        if int(values.get("flagged_transaction_count", 0)) > 0:
            lines.append(f"Flagged transactions detected: {int(values.get('flagged_transaction_count', 0))}.")
        if values.get("device_shutdown_after_incident"):
            lines.append("Device shutdown occurred shortly after incident.")
        if values.get("factory_reset_attempt"):
            lines.append("Factory reset attempt indicators detected.")
        if int(values.get("deleted_media_count", 0)) > 0:
            lines.append(f"Deleted media artifacts detected: {int(values.get('deleted_media_count', 0))}.")

        if not lines:
            lines.append("No high-confidence behavioral anomaly signals were detected.")

        return "Behavioral Pattern Summary:\n- " + "\n- ".join(lines)

    async def index_case_behavior(self, case_id: str) -> BehavioralIndexResponse:
        case_doc = await self.case_repo.get_by_id(case_id)
        if case_doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

        case_updated_at = case_doc.updated_at.isoformat()
        existing = await self.vector_store.get_case_embedding_record(case_id)
        existing_meta = existing.get("metadata", {}) if existing else {}

        features = await self.extract_behavioral_features(case_id)
        summary = await self._get_or_build_summary(case_id, case_updated_at, features)
        metadata = self._build_case_metadata(case_doc, case_updated_at, features)

        if existing_meta.get("case_updated_at") == case_updated_at and existing.get("embedding"):
            logger.info("behavioral_index_skipped", extra={"case_id": case_id, "reason": "unchanged_case"})
            return BehavioralIndexResponse(
                case_id=case_id,
                indexed=False,
                behavioral_features=features["behavioral_features"],
                behavioral_summary=summary,
            )

        try:
            embedding = await self.embedding_service.embed_text(summary)
            await self.vector_store.add_case_behavior_embedding(
                case_id=case_id,
                vector=embedding,
                summary=summary,
                metadata=metadata,
            )
            logger.info(
                "behavioral_index_generated",
                extra={"case_id": case_id, "embedding_dimensions": len(embedding)},
            )
            return BehavioralIndexResponse(
                case_id=case_id,
                indexed=True,
                behavioral_features=features["behavioral_features"],
                behavioral_summary=summary,
            )
        except Exception as exc:
            logger.exception(
                "behavioral_index_failed",
                extra={"case_id": case_id, "error": str(exc)},
            )
            return BehavioralIndexResponse(
                case_id=case_id,
                indexed=False,
                behavioral_features=features["behavioral_features"],
                behavioral_summary=summary,
            )

    async def find_similar_cases(self, case_id: str, top_k: int = 5) -> list[SimilarCaseResponse]:
        indexed = await self.index_case_behavior(case_id)
        base_record = await self.vector_store.get_case_embedding_record(case_id)
        query_embedding = base_record.get("embedding", [])
        if not query_embedding:
            return []

        rows = await self.vector_store.query_case_embeddings(query_vector=query_embedding, n_results=top_k + 1)
        target_summary = indexed.behavioral_summary
        results: list[SimilarCaseResponse] = []
        for row in rows:
            other_case_id = str(row.get("case_id", ""))
            if other_case_id == case_id:
                continue
            distance = float(row.get("distance", 1.0))
            similarity = max(0.0, 1.0 - distance)
            metadata = row.get("metadata", {})
            other_summary = str(row.get("document", ""))
            explanation, shared = await self._similarity_explanation(target_summary, other_summary)
            results.append(
                SimilarCaseResponse(
                    case_id=other_case_id,
                    similarity_score=round(similarity, 4),
                    crime_type=str(metadata.get("crime_type", "unknown")),
                    explanation=explanation,
                    shared_behavioral_signals=shared,
                )
            )
            if len(results) >= top_k:
                break
        return results

    async def _get_or_build_summary(
        self,
        case_id: str,
        case_updated_at: str,
        features: dict[str, Any],
    ) -> str:
        cache_key = f"behavior:summary:{case_id}:{case_updated_at}"
        cached = await self.redis_service.get_json(cache_key)
        if cached and isinstance(cached.get("summary"), str):
            return str(cached["summary"])
        summary = self.build_behavioral_summary(features)
        await self.redis_service.set_json(
            cache_key,
            {"summary": summary},
            ttl_seconds=self.settings.behavior_cache_ttl_seconds,
        )
        return summary

    def _infer_incident_time(self, events: list[Any]):
        if not events:
            from datetime import datetime, timezone

            return datetime.now(timezone.utc)
        priority = [
            e
            for e in events
            if e.event_type in {"DELETION", "SYSTEM"} or "incident" in e.raw_text.lower()
        ]
        base = priority[0] if priority else events[len(events) // 2]
        return base.timestamp

    def _build_case_metadata(
        self,
        case_doc: Any,
        case_updated_at: str,
        features: dict[str, Any],
    ) -> dict[str, Any]:
        crime_text = f"{case_doc.title} {case_doc.description or ''}".lower()
        if "fraud" in crime_text:
            crime_type = "financial_fraud"
        elif "murder" in crime_text or "homicide" in crime_text:
            crime_type = "violent_crime"
        elif "drugs" in crime_text or "narcotic" in crime_text:
            crime_type = "narcotics"
        else:
            crime_type = "unknown"

        return {
            "case_id": str(case_doc.id),
            "crime_type": crime_type,
            "incident_date": case_doc.created_at.date().isoformat(),
            "case_updated_at": case_updated_at,
            "feature_signature": hash(str(features["behavioral_features"])),
        }

    async def _similarity_explanation(self, target_summary: str, similar_summary: str) -> tuple[str, list[str]]:
        llm_result = await self.llm_service.structured_json(
            task_prompt=(
                "Compare the following two behavioral summaries and explain why they are similar.\n"
                f"Target summary: {target_summary}\n"
                f"Candidate summary: {similar_summary}\n"
                "Return JSON with similarity_explanation and shared_behavioral_signals."
            ),
            schema_hint={
                "similarity_explanation": "string",
                "shared_behavioral_signals": "array of strings",
            },
            system_prompt=SIMILARITY_SYSTEM_PROMPT,
            temperature=min(0.2, self.settings.deepinfra_temperature),
        )
        explanation = str(
            llm_result.get(
                "similarity_explanation",
                "Similar due to overlapping communication, location, and device behavior patterns.",
            )
        )
        shared_raw = llm_result.get("shared_behavioral_signals", [])
        if isinstance(shared_raw, list):
            shared = [str(item) for item in shared_raw[:8]]
        else:
            shared = []
        return explanation, shared
