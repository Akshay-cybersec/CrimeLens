import re
from datetime import datetime, timezone
from io import BytesIO

import fitz
import pdfplumber

from app.models.event import EventDocument, EventType
from app.utils.object_id import PyObjectId

EVENT_PATTERNS: list[tuple[EventType, str]] = [
    ("CALL", r"\bcall\b|incoming|outgoing|duration"),
    ("MESSAGE", r"\bsms\b|message|whatsapp|telegram|chat"),
    ("LOCATION", r"\bgps\b|location|lat|lon|cell tower"),
    ("APP_USAGE", r"application|app opened|screen time|usage"),
    ("DELETION", r"deleted|removed|wiped|erase"),
    ("SYSTEM", r"shutdown|reboot|boot|system"),
]

DATE_PATTERNS = [
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%d-%m-%Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
]


class UFDRParserService:
    async def parse_pdf_events(self, case_id: PyObjectId, file_bytes: bytes) -> list[EventDocument]:
        text_chunks = self._extract_text(file_bytes)
        events: list[EventDocument] = []

        for line in text_chunks:
            line_clean = line.strip()
            if len(line_clean) < 8:
                continue
            event_type = self._infer_event_type(line_clean)
            timestamp = self._extract_timestamp(line_clean)
            is_deleted = event_type == "DELETION" or "deleted" in line_clean.lower()
            metadata = {
                "source": "UFDR",
                "line_length": len(line_clean),
            }
            events.append(
                EventDocument(
                    case_id=case_id,
                    event_type=event_type,
                    timestamp=timestamp,
                    metadata=metadata,
                    raw_text=line_clean,
                    is_deleted=is_deleted,
                )
            )

        return events

    def _extract_text(self, file_bytes: bytes) -> list[str]:
        lines: list[str] = []
        stream = BytesIO(file_bytes)

        with fitz.open(stream=stream, filetype="pdf") as doc:
            for page in doc:
                page_text = page.get_text("text")
                lines.extend(page_text.splitlines())

        stream.seek(0)
        with pdfplumber.open(stream) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                lines.extend(page_text.splitlines())

        # Deduplicate while preserving order.
        seen: set[str] = set()
        unique_lines: list[str] = []
        for line in lines:
            key = line.strip()
            if key and key not in seen:
                seen.add(key)
                unique_lines.append(key)
        return unique_lines

    def _infer_event_type(self, text: str) -> EventType:
        lower = text.lower()
        for event_type, pattern in EVENT_PATTERNS:
            if re.search(pattern, lower):
                return event_type
        return "SYSTEM"

    def _extract_timestamp(self, text: str) -> datetime:
        timestamp_match = re.search(r"\d{2,4}[-/]\d{1,2}[-/]\d{1,4}\s+\d{1,2}:\d{2}(?::\d{2})?", text)
        if timestamp_match:
            raw = timestamp_match.group(0)
            for fmt in DATE_PATTERNS:
                try:
                    return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
        return datetime.now(timezone.utc)
