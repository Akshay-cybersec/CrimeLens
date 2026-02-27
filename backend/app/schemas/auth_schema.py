from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.user import Role, UserStatus


class SignupRequest(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=8, max_length=256)
    full_name: str = Field(min_length=2, max_length=120)


class SignupResponse(BaseModel):
    message: str


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=8, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class PendingUserResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: Role
    status: UserStatus
    is_active: bool
    created_at: datetime


class ApprovalActionResponse(BaseModel):
    message: str
