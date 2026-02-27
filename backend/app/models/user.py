from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.utils.object_id import PyObjectId

Role = Literal["SUPER_ADMIN", "ADMIN", "INVESTIGATOR", "ANALYST"]
UserStatus = Literal["PENDING", "APPROVED", "REJECTED"]


class UserDocument(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: str
    password_hash: str
    full_name: str
    role: Role = "INVESTIGATOR"
    status: UserStatus = "PENDING"
    is_active: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved_by: Optional[PyObjectId] = None
    approved_at: Optional[datetime] = None

    model_config = {"populate_by_name": True}
