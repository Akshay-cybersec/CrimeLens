from datetime import timedelta
from statistics import mean

from app.repositories.events import EventRepository
from app.schemas.case import TimelineResponse
from app.schemas.event import EventResponse
from app.utils.pagination import PageMeta


class TimelineService:
    def __init__(self, event_repo: EventRepository) -> None:
        self.event_repo = event_repo

    async def build_timeline(self, case_id: str, page: int, page_size: int) -> TimelineResponse:
        events, total = await self.event_repo.list_by_case(case_id, page=page, page_size=page_size)
        agg = await self.event_repo.aggregate_timeline(case_id)

        suspicious_windows: list[dict] = []
        counts = [row["count"] for row in agg]
        avg_count = mean(counts) if counts else 0.0

        for idx, row in enumerate(agg):
            current_hour = row.get("_id")
            current_count = int(row.get("count", 0))
            deletions = int(row.get("deletions", 0))

            if current_count > max(5, avg_count * 2):
                suspicious_windows.append(
                    {
                        "start": current_hour,
                        "end": current_hour + timedelta(hours=1),
                        "reason": "Burst activity detected",
                        "severity": "medium",
                    }
                )

            if deletions >= 3:
                suspicious_windows.append(
                    {
                        "start": current_hour,
                        "end": current_hour + timedelta(hours=1),
                        "reason": "Pre-deletion spike",
                        "severity": "high",
                    }
                )

            if idx > 0:
                prev_hour = agg[idx - 1].get("_id")
                if current_hour and prev_hour and (current_hour - prev_hour) > timedelta(hours=8):
                    suspicious_windows.append(
                        {
                            "start": prev_hour,
                            "end": current_hour,
                            "reason": "Activity gap",
                            "severity": "low",
                        }
                    )

        timeline_items = [
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

        start_ts = events[0].timestamp if events else None
        end_ts = events[-1].timestamp if events else None
        density = min(1.0, len(events) / max(1, page_size))

        return TimelineResponse(
            case_id=case_id,
            time_range={"start": start_ts, "end": end_ts},
            activity_density_score=round(density, 3),
            suspicious_windows=suspicious_windows,
            pagination=PageMeta(page=page, page_size=page_size, total=total),
            timeline=timeline_items,
        )
