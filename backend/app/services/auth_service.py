from __future__ import annotations

from fastapi import HTTPException, status

from app.core.config import Settings
from app.core.security import AuthUser, create_access_token, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    ApprovalActionResponse,
    LoginRequest,
    PendingUserResponse,
    SignupRequest,
    SignupResponse,
    TokenResponse,
)


class AuthService:
    def __init__(self, users_repo: UserRepository, settings: Settings) -> None:
        self.users_repo = users_repo
        self.settings = settings

    async def signup(self, payload: SignupRequest) -> SignupResponse:
        try:
            await self.users_repo.create_pending_user(
                email=payload.email.lower().strip(),
                password=payload.password,
                full_name=payload.full_name.strip(),
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
        return SignupResponse(message="Your account is pending admin approval")

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self.users_repo.get_by_email(payload.email.lower().strip())
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if user.status != "APPROVED" or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not approved or inactive",
            )
        token = create_access_token(user_id=str(user.id), role=user.role, email=user.email)
        return TokenResponse(
            access_token=token,
            expires_in=self.settings.jwt_access_token_expire_minutes * 60,
        )

    async def list_pending_users(self) -> list[PendingUserResponse]:
        users = await self.users_repo.list_pending_users()
        return [
            PendingUserResponse(
                user_id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                status=user.status,
                is_active=user.is_active,
                created_at=user.created_at,
            )
            for user in users
        ]

    async def approve_user(self, user_id: str, current_user: AuthUser) -> ApprovalActionResponse:
        updated = await self.users_repo.approve_user(user_id=user_id, approver_id=current_user.id)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return ApprovalActionResponse(message="User approved successfully")

    async def reject_user(self, user_id: str) -> ApprovalActionResponse:
        updated = await self.users_repo.reject_user(user_id=user_id)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return ApprovalActionResponse(message="User rejected successfully")
