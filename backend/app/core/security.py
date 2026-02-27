from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Sequence

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import get_settings
from app.models.user import UserStatus

pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")
auth_scheme = HTTPBearer(auto_error=True)
_passlib_bcrypt_usable: bool | None = None

Role = Literal["SUPER_ADMIN", "ADMIN", "INVESTIGATOR", "ANALYST"]


class TokenPayload(BaseModel):
    user_id: str
    role: Role
    email: str
    exp: int


class AuthUser(BaseModel):
    id: str
    email: str
    role: Role
    status: UserStatus
    is_active: bool


def _is_passlib_bcrypt_usable() -> bool:
    global _passlib_bcrypt_usable
    if _passlib_bcrypt_usable is not None:
        return _passlib_bcrypt_usable
    if not hasattr(bcrypt, "__about__"):
        _passlib_bcrypt_usable = False
        return _passlib_bcrypt_usable
    try:
        pwd_context.hash("passlib-backend-check")
        _passlib_bcrypt_usable = True
    except Exception:
        _passlib_bcrypt_usable = False
    return _passlib_bcrypt_usable


def hash_password(password: str) -> str:
    if _is_passlib_bcrypt_usable():
        return pwd_context.hash(password)
    # Fallback for environments where passlib+bcrypt backend compatibility is broken.
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if _is_passlib_bcrypt_usable():
        return pwd_context.verify(plain_password, hashed_password)
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(user_id: str, role: Role, email: str) -> str:
    settings = get_settings()
    expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    payload: dict[str, Any] = {
        "user_id": user_id,
        "role": role,
        "email": email,
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> TokenPayload:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return TokenPayload(**payload)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        ) from exc


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
) -> AuthUser:
    from app.repositories.user_repository import UserRepository

    payload = decode_access_token(credentials.credentials)
    users_repo = UserRepository(request.app.state.mongo_db)
    user = await users_repo.get_by_id(payload.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    if user.email != payload.email or user.role != payload.role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    if user.status != "APPROVED" or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not active")
    return AuthUser(
        id=str(user.id),
        email=user.email,
        role=user.role,
        status=user.status,
        is_active=user.is_active,
    )


def require_roles(roles: Sequence[Role]):
    async def _role_dependency(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return _role_dependency
