from fastapi import HTTPException, status

from app.core.security import create_access_token, verify_password
from app.repositories.users import UserRepository
from app.schemas.auth import LoginRequest, TokenResponse


class AuthService:
    def __init__(self, users_repo: UserRepository) -> None:
        self.users_repo = users_repo

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self.users_repo.get_by_username(payload.username)
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        token = create_access_token(user.id, user.role)
        return TokenResponse(access_token=token)
