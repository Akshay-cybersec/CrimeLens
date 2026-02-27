from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import get_auth_service
from app.core.security import AuthUser, require_roles
from app.schemas.auth import (
    ApprovalActionResponse,
    LoginRequest,
    PendingUserResponse,
    SignupRequest,
    SignupResponse,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=SignupResponse)
async def signup(payload: SignupRequest, auth_service: AuthService = Depends(get_auth_service)) -> SignupResponse:
    return await auth_service.signup(payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, auth_service: AuthService = Depends(get_auth_service)) -> TokenResponse:
    return await auth_service.login(payload)


@router.get(
    "/pending-users",
    response_model=list[PendingUserResponse],
    dependencies=[Depends(require_roles(["SUPER_ADMIN"]))],
)
async def pending_users(auth_service: AuthService = Depends(get_auth_service)) -> list[PendingUserResponse]:
    return await auth_service.list_pending_users()


@router.post(
    "/approve/{user_id}",
    response_model=ApprovalActionResponse,
)
async def approve_user(
    user_id: str,
    auth_service: AuthService = Depends(get_auth_service),
    current_user: AuthUser = Depends(require_roles(["SUPER_ADMIN"])),
) -> ApprovalActionResponse:
    return await auth_service.approve_user(user_id=user_id, current_user=current_user)


@router.post(
    "/reject/{user_id}",
    response_model=ApprovalActionResponse,
    dependencies=[Depends(require_roles(["SUPER_ADMIN"]))],
)
async def reject_user(user_id: str, auth_service: AuthService = Depends(get_auth_service)) -> ApprovalActionResponse:
    return await auth_service.reject_user(user_id=user_id)
