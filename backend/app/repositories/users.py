from __future__ import annotations

from typing import Optional

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.user import UserDocument


class UserRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self._users: dict[str, UserDocument] = {
            settings.admin_username: UserDocument(
                id=settings.admin_username,
                username=settings.admin_username,
                role="Admin",
                password_hash=hash_password(settings.admin_password),
            ),
            settings.investigator_username: UserDocument(
                id=settings.investigator_username,
                username=settings.investigator_username,
                role="Investigator",
                password_hash=hash_password(settings.investigator_password),
            ),
            settings.analyst_username: UserDocument(
                id=settings.analyst_username,
                username=settings.analyst_username,
                role="Analyst",
                password_hash=hash_password(settings.analyst_password),
            ),
        }

    async def get_by_username(self, username: str) -> Optional[UserDocument]:
        return self._users.get(username)
