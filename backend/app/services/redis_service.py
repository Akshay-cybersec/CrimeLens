from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from redis.asyncio import Redis

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class _MemoryCacheItem:
    value: str
    expires_at: datetime


class RedisService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: Optional[Redis] = None
        self._memory_cache: dict[str, _MemoryCacheItem] = {}

    async def connect(self) -> None:
        if not self._settings.redis_enabled:
            logger.info("redis_disabled_using_memory_cache")
            return
        try:
            self._client = Redis.from_url(self._settings.redis_url, decode_responses=True)
            await self._client.ping()
            logger.info("redis_connected")
        except Exception as exc:
            logger.warning("redis_unavailable_falling_back_to_memory_cache", extra={"error": str(exc)})
            self._client = None

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
        self._memory_cache.clear()

    @property
    def client(self) -> Optional[Redis]:
        return self._client

    async def enqueue_case_job(self, case_id: str) -> None:
        if self._client is None:
            return
        await self._client.lpush("forensic:jobs:case_process", case_id)

    async def get_json(self, key: str) -> Optional[dict]:
        raw: Optional[str]
        if self._client is not None:
            raw = await self._client.get(key)
        else:
            raw = self._memory_get(key)
        if not raw:
            return None
        try:
            data = json.loads(raw)
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None

    async def set_json(self, key: str, value: dict, ttl_seconds: int) -> None:
        if self._client is None:
            self._memory_set(key, json.dumps(value), ttl_seconds)
            return
        await self._client.set(key, json.dumps(value), ex=ttl_seconds)

    async def set_if_absent(self, key: str, value: str, ttl_seconds: int) -> bool:
        if self._client is None:
            if self._memory_get(key) is not None:
                return False
            self._memory_set(key, value, ttl_seconds)
            return True
        result = await self._client.set(key, value, ex=ttl_seconds, nx=True)
        return bool(result)

    async def delete_key(self, key: str) -> None:
        if self._client is None:
            self._memory_cache.pop(key, None)
            return
        await self._client.delete(key)

    def _memory_get(self, key: str) -> Optional[str]:
        item = self._memory_cache.get(key)
        if item is None:
            return None
        if item.expires_at <= datetime.now(timezone.utc):
            self._memory_cache.pop(key, None)
            return None
        return item.value

    def _memory_set(self, key: str, value: str, ttl_seconds: int) -> None:
        self._memory_prune_expired()
        self._memory_ensure_capacity()
        self._memory_cache[key] = _MemoryCacheItem(
            value=value,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=max(1, ttl_seconds)),
        )

    def _memory_prune_expired(self) -> None:
        now = datetime.now(timezone.utc)
        expired_keys = [key for key, item in self._memory_cache.items() if item.expires_at <= now]
        for key in expired_keys:
            self._memory_cache.pop(key, None)

    def _memory_ensure_capacity(self) -> None:
        limit = max(10, self._settings.memory_cache_max_items)
        if len(self._memory_cache) < limit:
            return
        oldest_key = min(self._memory_cache.items(), key=lambda entry: entry[1].expires_at)[0]
        self._memory_cache.pop(oldest_key, None)
