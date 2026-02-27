from datetime import UTC, datetime

from pydantic import BaseModel, Field

from app.utils.object_id import PyObjectId


class CaseDocument(BaseModel):
    id: PyObjectId | None = Field(default=None, alias="_id")
    title: str
    description: str | None = None
    source_filename: str
    owner_id: str
    assigned_user_ids: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {"populate_by_name": True}
