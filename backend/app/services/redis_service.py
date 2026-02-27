from __future__ import annotations

import json
from typing import Optional

from redis.asyncio import Redis

from app.core.config import Settings


class RedisService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: Optional[Redis] = None

    async def connect(self) -> None:
        if not self._settings.redis_enabled:
            return
        self._client = Redis.from_url(self._settings.redis_url, decode_responses=True)

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()

    @property
    def client(self) -> Optional[Redis]:
        return self._client

    async def enqueue_case_job(self, case_id: str) -> None:
        if self._client is None:
            return
        await self._client.lpush("forensic:jobs:case_process", case_id)

    async def get_json(self, key: str) -> Optional[dict]:
        if self._client is None:
            return None
        raw = await self._client.get(key)
        if not raw:
            return None
        try:
            data = json.loads(raw)
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None

    async def set_json(self, key: str, value: dict, ttl_seconds: int) -> None:
        if self._client is None:
            return
        await self._client.set(key, json.dumps(value), ex=ttl_seconds)

    async def set_if_absent(self, key: str, value: str, ttl_seconds: int) -> bool:
        if self._client is None:
            return True
        result = await self._client.set(key, value, ex=ttl_seconds, nx=True)
        return bool(result)

    async def delete_key(self, key: str) -> None:
        if self._client is None:
            return
        await self._client.delete(key)
