from typing import Any

import httpx

from app.core.config import Settings


class EmbeddingService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def embed_text(self, text: str) -> list[float]:
        if not self.settings.deepinfra_api_key:
            return [0.0] * self.settings.embedding_dimensions

        payload = {
            "model": self.settings.deepinfra_embedding_model,
            "input": text,
        }
        headers = {
            "Authorization": f"Bearer {self.settings.deepinfra_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.settings.deepinfra_base_url}/embeddings",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data: dict[str, Any] = response.json()

        emb = data.get("data", [{}])[0].get("embedding", [])
        vector = [float(x) for x in emb]
        return self._normalize_dimensions(vector)

    def _normalize_dimensions(self, vector: list[float]) -> list[float]:
        target = self.settings.embedding_dimensions
        if not vector:
            return [0.0] * target
        if len(vector) >= target:
            return vector[:target]
        return vector + ([0.0] * (target - len(vector)))
