from datetime import datetime
from typing import Any

from pydantic import BaseModel


class EventResponse(BaseModel):
    id: str
    case_id: str
    event_type: str
    timestamp: datetime
    metadata: dict[str, Any]
    raw_text: str
    is_deleted: bool
