from app.schemas.analysis import SimilarCaseResponse
from app.vector.chroma_client import ChromaCloudStore


class SimilarCaseService:
    def __init__(self, vector_store: ChromaCloudStore) -> None:
        self.vector_store = vector_store

    async def find_similar(self, case_id: str, top_k: int = 5) -> list[SimilarCaseResponse]:
        matches = await self.vector_store.similar_cases(case_id, top_k=top_k)
        return [
            SimilarCaseResponse(
                similar_case_id=other_id,
                similarity_score=round(score, 4),
                explanation="Case-level semantic embedding similarity.",
            )
            for other_id, score in matches
        ]
