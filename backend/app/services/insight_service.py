from statistics import mean

from bson import ObjectId

from app.ai.llm_service import LLMService
from app.models.insight import InsightDocument
from app.repositories.events import EventRepository
from app.repositories.insights import InsightRepository
from app.schemas.analysis import InsightResponse


class InsightService:
    def __init__(
        self,
        event_repo: EventRepository,
        insight_repo: InsightRepository,
        llm_service: LLMService,
    ) -> None:
        self.event_repo = event_repo
        self.insight_repo = insight_repo
        self.llm_service = llm_service

    async def generate(self, case_id: str) -> list[InsightResponse]:
        events = await self.event_repo.all_by_case(case_id)
        if not events:
            return []

        deletions = [e for e in events if e.event_type == "DELETION" or e.is_deleted]
        messages = [e for e in events if e.event_type == "MESSAGE"]
        system_events = [e for e in events if e.event_type == "SYSTEM"]

        summary_payload = {
            "total_events": len(events),
            "deletions": len(deletions),
            "messages": len(messages),
            "system_events": len(system_events),
            "deletion_ratio": round(len(deletions) / max(1, len(events)), 4),
            "sample": [
                {
                    "event_id": str(item.id),
                    "type": item.event_type,
                    "timestamp": item.timestamp.isoformat(),
                }
                for item in events[:30]
            ],
        }

        llm_result = await self.llm_service.structured_json(
            task_prompt=(
                "Generate probabilistic investigative insight without legal conclusion. "
                f"Data summary: {summary_payload}"
            ),
            schema_hint={
                "summary": "string",
                "confidence_score": "number 0-1",
                "reasoning": "string",
            },
        )

        supporting = [item.id for item in deletions[:5] + messages[:5] if item.id]
        default_conf = min(0.95, max(0.25, mean([len(deletions) / max(1, len(events)), len(messages) / max(1, len(events))])))

        insight = InsightDocument(
            case_id=ObjectId(case_id),
            summary=str(llm_result.get("summary", "Pattern anomalies detected across timeline.")),
            supporting_event_ids=supporting,
            confidence_score=float(llm_result.get("confidence_score", default_conf)),
            reasoning=str(llm_result.get("reasoning", "Derived from deletion/message/system event correlation.")),
        )
        saved = await self.insight_repo.create(insight)

        return [
            InsightResponse(
                id=str(saved.id),
                summary=saved.summary,
                supporting_event_ids=[str(item) for item in saved.supporting_event_ids],
                confidence_score=saved.confidence_score,
                reasoning=saved.reasoning,
            )
        ]
