from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.utils.object_id import PyObjectId

CaseStatus = Literal["OPEN", "PENDING", "CLOSED"]


class CaseDocument(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    title: str
    description: Optional[str] = None
    source_filename: str
    source_filenames: list[str] = Field(default_factory=list)
    owner_id: str
    assigned_user_ids: list[str] = Field(default_factory=list)
    status: CaseStatus = "OPEN"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
