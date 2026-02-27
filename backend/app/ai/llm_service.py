import json
from typing import Any, Optional

import httpx

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger(__name__)

SYSTEM_PROMPT = (
    "You are a forensic investigative assistant. "
    "You provide probabilistic behavioral analysis only. "
    "You never make legal conclusions. "
    "You remain neutral and analytical."
)


class LLMService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def structured_json(
        self,
        task_prompt: str,
        schema_hint: dict[str, Any],
        *,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> dict[str, Any]:
        if not self.settings.deepinfra_api_key:
            return {
                "interpreted_query": task_prompt,
                "explanation": "LLM API key not configured; returning deterministic fallback.",
                "schema_hint": schema_hint,
            }

        headers = {
            "Authorization": f"Bearer {self.settings.deepinfra_api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.settings.deepinfra_llm_model,
            "temperature": temperature if temperature is not None else self.settings.deepinfra_temperature,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Return strict JSON object only. "
                        f"Schema hint: {json.dumps(schema_hint)}. "
                        f"Task: {task_prompt}"
                    ),
                },
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.settings.deepinfra_base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
            body = response.json()
            content = body["choices"][0]["message"]["content"]
            parsed: dict[str, Any] = json.loads(content)
            return parsed
        except (httpx.HTTPError, ValueError, KeyError, json.JSONDecodeError) as exc:
            logger.exception("llm_call_failed", extra={"error": str(exc)})
            return {
                "error": "LLM call failed",
                "interpreted_query": task_prompt,
                "explanation": "Deterministic fallback used due to LLM error.",
            }
