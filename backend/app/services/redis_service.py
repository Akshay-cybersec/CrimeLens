from redis.asyncio import Redis

from app.core.config import Settings


class RedisService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: Redis | None = None

    async def connect(self) -> None:
        if not self._settings.redis_enabled:
            return
        self._client = Redis.from_url(self._settings.redis_url, decode_responses=True)

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()

    @property
    def client(self) -> Redis | None:
        return self._client

    async def enqueue_case_job(self, case_id: str) -> None:
        if self._client is None:
            return
        await self._client.lpush("forensic:jobs:case_process", case_id)
