from typing import Any

from app.repositories.base import BaseRepository


class DashboardMetricsRepository(BaseRepository):
    def __init__(self, db: Any) -> None:
        super().__init__(db, "dashboard_metrics")

    async def ensure_demo_defaults(self) -> None:
        existing = await self.collection.find_one({"_id": "default"})
        if existing:
            return
        await self.collection.insert_one(
            {
                "_id": "default",
                "total_cases": 147,
                "cases_with_insights": 124,
                "active_cases": 18,
                "flagged_clusters": 32,
                "total_artifacts": 142893,
                "flagged_messages": 412,
                "media_files": 8431,
                "location_pins": 1024,
            }
        )

    async def get_metrics(self) -> dict[str, int]:
        data = await self.collection.find_one({"_id": "default"}) or {}
        return {
            "total_cases": int(data.get("total_cases", 0)),
            "cases_with_insights": int(data.get("cases_with_insights", 0)),
            "active_cases": int(data.get("active_cases", 0)),
            "flagged_clusters": int(data.get("flagged_clusters", 0)),
            "total_artifacts": int(data.get("total_artifacts", 0)),
            "flagged_messages": int(data.get("flagged_messages", 0)),
            "media_files": int(data.get("media_files", 0)),
            "location_pins": int(data.get("location_pins", 0)),
        }
