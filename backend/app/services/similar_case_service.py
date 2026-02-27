from app.schemas.analysis import SimilarCaseResponse
from app.services.case_behavior_service import CaseBehaviorService


class SimilarCaseService:
    def __init__(self, case_behavior_service: CaseBehaviorService) -> None:
        self.case_behavior_service = case_behavior_service

    async def find_similar(self, case_id: str, top_k: int = 5) -> list[SimilarCaseResponse]:
        return await self.case_behavior_service.find_similar_cases(case_id, top_k=top_k)
