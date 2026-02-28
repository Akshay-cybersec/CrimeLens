from __future__ import annotations

import re
import json
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

import fitz
import pdfplumber

from app.models.event import EventDocument, EventType
from app.utils.object_id import PyObjectId

EVENT_PATTERNS: list[tuple[EventType, str]] = [
    ("DELETION", r"deleted|removed|wiped|erase"),
    ("MESSAGE", r"\bsms\b|message|whatsapp|telegram|chat"),
    ("CALL", r"\bcall\b|call_type|duration_seconds|voice"),
    ("LOCATION", r"\bgps\b|location|lat|lon|cell tower"),
    ("APP_USAGE", r"application|app opened|screen time|usage"),
    ("SYSTEM", r"shutdown|reboot|boot|system"),
]

DATE_PATTERNS = [
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%d-%m-%Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
]


class UFDRParserService:
    async def parse_events(
        self,
        case_id: PyObjectId,
        file_bytes: bytes,
        filename: str | None = None,
    ) -> list[EventDocument]:
        text_chunks = self._extract_text(file_bytes, filename)
        events: list[EventDocument] = []
        source_name = filename or "uploaded_file"
        source_ext = Path(source_name).suffix.lower() or "unknown"

        for line in text_chunks:
            line_clean = line.strip()
            if len(line_clean) < 8:
                continue
            event_type = self._infer_event_type(line_clean)
            timestamp = self._extract_timestamp(line_clean)
            is_deleted = event_type == "DELETION" or "deleted" in line_clean.lower()
            metadata = {
                "source": source_name,
                "source_type": source_ext,
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

        # Always return at least one record so timeline is available after upload.
        if not events:
            events.append(
                EventDocument(
                    case_id=case_id,
                    event_type="SYSTEM",
                    timestamp=datetime.now(timezone.utc),
                    metadata={"source": source_name, "source_type": source_ext, "line_length": 0},
                    raw_text=f"File uploaded: {source_name}. No parseable events were found.",
                    is_deleted=False,
                )
            )

        return events

    async def parse_pdf_events(self, case_id: PyObjectId, file_bytes: bytes) -> list[EventDocument]:
        # Backward-compatible entrypoint.
        return await self.parse_events(case_id=case_id, file_bytes=file_bytes, filename="uploaded.pdf")

    def _extract_text(self, file_bytes: bytes, filename: str | None = None) -> list[str]:
        ext = Path(filename or "").suffix.lower()

        # UFDR files in this project are mostly JSON/text-based.
        if ext in {".ufdr", ".json", ".txt", ".log"}:
            return self._extract_text_from_textual(file_bytes)
        if ext == ".zip":
            return self._extract_text_from_zip(file_bytes)

        # If extension is unknown, detect by file signature/content.
        if file_bytes.startswith(b"%PDF"):
            return self._extract_text_from_pdf(file_bytes)
        if file_bytes.startswith(b"PK"):
            return self._extract_text_from_zip(file_bytes)

        # Fallback: try textual parse first, then PDF.
        textual = self._extract_text_from_textual(file_bytes)
        if textual:
            return textual
        return self._extract_text_from_pdf(file_bytes)

    def _extract_text_from_pdf(self, file_bytes: bytes) -> list[str]:
        lines: list[str] = []
        stream = BytesIO(file_bytes)
        try:
            with fitz.open(stream=stream, filetype="pdf") as doc:
                for page in doc:
                    page_text = page.get_text("text")
                    lines.extend(page_text.splitlines())
        except Exception:
            return []

        stream.seek(0)
        try:
            with pdfplumber.open(stream) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    lines.extend(page_text.splitlines())
        except Exception:
            pass

        return self._unique(lines)

    def _extract_text_from_textual(self, file_bytes: bytes) -> list[str]:
        raw_text = file_bytes.decode("utf-8", errors="ignore")
        if not raw_text.strip():
            return []

        # Try structured JSON UFDR first.
        try:
            payload = json.loads(raw_text)
            return self._extract_lines_from_json(payload)
        except Exception:
            pass

        return self._unique(raw_text.splitlines())

    def _extract_text_from_zip(self, file_bytes: bytes) -> list[str]:
        lines: list[str] = []
        try:
            with zipfile.ZipFile(BytesIO(file_bytes)) as archive:
                for member in archive.namelist():
                    lower = member.lower()
                    if not lower.endswith((".json", ".txt", ".log", ".csv")):
                        continue
                    try:
                        content = archive.read(member)
                    except Exception:
                        continue
                    if lower.endswith(".json"):
                        try:
                            payload = json.loads(content.decode("utf-8", errors="ignore"))
                            lines.extend(self._extract_lines_from_json(payload))
                            continue
                        except Exception:
                            pass
                    lines.extend(content.decode("utf-8", errors="ignore").splitlines())
        except Exception:
            return []

        return self._unique(lines)

    def _extract_lines_from_json(self, payload: Any) -> list[str]:
        lines: list[str] = []
        event_id_fields = {
            "message_id",
            "log_id",
            "point_id",
            "activity_id",
            "transaction_id",
            "event_id",
        }
        summary_fields = (
            "event_type",
            "type",
            "platform",
            "direction",
            "contact_name",
            "phone_number",
            "content",
            "notes",
            "action",
            "query",
            "memo",
            "flag_reason",
            "resolved_address",
            "result",
            "status",
            "app",
            "sender",
            "amount_inr",
            "location",
            "source",
        )
        ignore_fields = {
            "timestamp",
            "time",
            "date",
            "id",
            "_id",
            "case_id",
            "message_id",
            "log_id",
            "point_id",
            "activity_id",
            "transaction_id",
            "event_id",
            "suspect_id",
        }

        profile_like_keys = {"victim_info", "secondary_victim", "suspect_info", "accused_info", "complainant_info", "victim", "persons"}
        role_alias = {
            "victim_info": "victim",
            "secondary_victim": "secondary_victim",
            "suspect_info": "suspect",
            "accused_info": "suspect",
            "complainant_info": "complainant",
            "victim": "victim",
        }

        def maybe_emit_profile_line(node: dict[str, Any], parent_key: str | None) -> None:
            if not parent_key:
                return
            parent_key_l = parent_key.lower()
            inferred_role: str | None = None
            if parent_key_l in role_alias:
                inferred_role = role_alias[parent_key_l]
            elif parent_key_l.startswith("suspect"):
                inferred_role = "suspect"
            elif parent_key_l.startswith("victim"):
                inferred_role = "victim"
            elif parent_key_l.startswith("complainant"):
                inferred_role = "complainant"
            elif parent_key_l.startswith("accused"):
                inferred_role = "suspect"
            elif parent_key_l in profile_like_keys:
                inferred_role = parent_key_l

            if not inferred_role:
                return

            name = node.get("name")
            if not isinstance(name, str) or not name.strip():
                return
            role = inferred_role
            profile_parts = [f"role:{role}", f"name:{name.strip()}"]
            for field in ("age", "status", "relation", "incident_type", "prior_record", "data_compromised"):
                value = node.get(field)
                if value is not None:
                    profile_parts.append(f"{field}:{value}")
            lines.append("profile_event | " + " | ".join(profile_parts))

        def walk(node: Any, parent_key: str | None = None) -> None:
            if isinstance(node, dict):
                maybe_emit_profile_line(node, parent_key)
                ts = node.get("timestamp") or node.get("time") or node.get("date")
                text = node.get("raw_text") or node.get("message") or node.get("text") or node.get("description")
                event_type = node.get("event_type") or node.get("type") or node.get("action")
                key_values: list[str] = []
                for key in summary_fields:
                    value = node.get(key)
                    if value is None:
                        continue
                    key_values.append(f"{key}:{value}")
                if not key_values:
                    # Fallback: include short scalar fields so per-event lines are still meaningful.
                    for key, value in node.items():
                        if key in ignore_fields:
                            continue
                        if isinstance(value, (str, int, float, bool)):
                            key_values.append(f"{key}:{value}")
                        if len(key_values) >= 6:
                            break
                summary_text = text or " | ".join(key_values)
                has_event_marker = any(field in node for field in event_id_fields)
                if ts or has_event_marker:
                    parts = [str(part) for part in [ts, event_type, summary_text] if part]
                    if parts:
                        lines.append(" | ".join(parts))
                for child_key, value in node.items():
                    walk(value, child_key if isinstance(child_key, str) else None)
                return
            if isinstance(node, list):
                for item in node:
                    walk(item, parent_key)
                return

        walk(payload)
        return self._unique(lines)

    def _unique(self, lines: list[str]) -> list[str]:
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
        # Handle ISO-8601 timestamps commonly present in UFDR JSON exports.
        iso_match = re.search(
            r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})?",
            text,
        )
        if iso_match:
            raw_iso = iso_match.group(0)
            normalized = raw_iso.replace("Z", "+00:00")
            try:
                parsed = datetime.fromisoformat(normalized)
                if parsed.tzinfo is None:
                    return parsed.replace(tzinfo=timezone.utc)
                return parsed.astimezone(timezone.utc)
            except ValueError:
                pass

        timestamp_match = re.search(r"\d{2,4}[-/]\d{1,2}[-/]\d{1,4}\s+\d{1,2}:\d{2}(?::\d{2})?", text)
        if timestamp_match:
            raw = timestamp_match.group(0)
            for fmt in DATE_PATTERNS:
                try:
                    return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
        date_only_match = re.search(r"\d{4}-\d{2}-\d{2}", text)
        if date_only_match:
            try:
                return datetime.strptime(date_only_match.group(0), "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        return datetime.now(timezone.utc)
