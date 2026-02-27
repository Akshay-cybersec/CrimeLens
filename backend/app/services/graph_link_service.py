from __future__ import annotations

import re
from collections import defaultdict, deque
from itertools import combinations
from typing import Any

from app.ai.llm_service import LLMService
from app.models.event import EventDocument
from app.repositories.events import EventRepository
from app.schemas.analysis import (
    ConnectionGraphResponse,
    GraphEdgeResponse,
    GraphNodeResponse,
    HiddenClusterResponse,
)

EntityType = str
ALLOWED_ENTITY_TYPES: set[EntityType] = {
    "PERSON",
    "LOCATION",
    "WIFI_NETWORK",
    "CONTACT",
    "DEVICE_OWNER",
    "OTHER",
}


class GraphLinkService:
    def __init__(self, event_repo: EventRepository, llm_service: LLMService) -> None:
        self.event_repo = event_repo
        self.llm_service = llm_service

    async def build_connection_graph(self, case_id: str) -> ConnectionGraphResponse:
        events = await self.event_repo.all_by_case(case_id)
        if not events:
            return ConnectionGraphResponse(case_id=case_id)

        owner = "Primary Device"
        parsed_events: list[dict[str, Any]] = []
        candidates: set[str] = {owner}

        for event in events:
            fields = self._parse_fields(event.raw_text)
            people = self._extract_people(event.raw_text, fields)
            locations = self._extract_locations(fields)
            networks = self._extract_wifi_networks(fields, event.raw_text)
            contacts = self._extract_contacts(fields)
            parsed_events.append(
                {
                    "event": event,
                    "people": people,
                    "locations": locations,
                    "networks": networks,
                    "contacts": contacts,
                }
            )
            candidates.update(people)
            candidates.update(locations)
            candidates.update(networks)
            candidates.update(contacts)

        entity_types = await self._classify_entities_with_llm(sorted(candidates))
        entity_types[owner] = "DEVICE_OWNER"

        nodes: dict[str, GraphNodeResponse] = {
            owner: GraphNodeResponse(id=owner, label=owner, node_type="DEVICE_OWNER", score=1.0)
        }
        edge_map: dict[tuple[str, str, str], GraphEdgeResponse] = {}

        location_participants: dict[str, set[str]] = defaultdict(set)
        location_event_ids: dict[str, set[str]] = defaultdict(set)
        wifi_participants: dict[str, set[str]] = defaultdict(set)
        wifi_event_ids: dict[str, set[str]] = defaultdict(set)
        contact_participants: dict[str, set[str]] = defaultdict(set)
        contact_event_ids: dict[str, set[str]] = defaultdict(set)

        for row in parsed_events:
            event: EventDocument = row["event"]
            event_id = str(event.id) if event.id else ""

            people = [item for item in row["people"] if entity_types.get(item) in {"PERSON", "DEVICE_OWNER"}]
            locations = [item for item in row["locations"] if entity_types.get(item) in {"LOCATION", "OTHER"}]
            networks = [item for item in row["networks"] if entity_types.get(item) in {"WIFI_NETWORK", "OTHER"}]
            contacts = row["contacts"]

            for person in people:
                node_type = entity_types.get(person, "PERSON")
                nodes.setdefault(person, GraphNodeResponse(id=person, label=person, node_type=node_type, score=0.6))

            if len(people) == 1:
                self._add_edge(edge_map, owner, people[0], f"{event.event_type.lower()} interaction", event_id)
            elif len(people) >= 2:
                for a, b in combinations(sorted(people), 2):
                    self._add_edge(edge_map, a, b, "shared uncommon contact", event_id)

            for location in locations:
                nodes.setdefault(location, GraphNodeResponse(id=location, label=location, node_type="LOCATION", score=0.7))
                participants = people if people else [owner]
                for participant in participants:
                    location_participants[location].add(participant)
                if event_id:
                    location_event_ids[location].add(event_id)

            for network in networks:
                nodes.setdefault(network, GraphNodeResponse(id=network, label=network, node_type="WIFI_NETWORK", score=0.8))
                participants = people if people else [owner]
                for participant in participants:
                    wifi_participants[network].add(participant)
                if event_id:
                    wifi_event_ids[network].add(event_id)

            for contact in contacts:
                contact_type = entity_types.get(contact, self._heuristic_entity_type(contact))
                if contact_type == "PERSON":
                    nodes.setdefault(contact, GraphNodeResponse(id=contact, label=contact, node_type="PERSON", score=0.55))
                elif contact_type == "CONTACT":
                    nodes.setdefault(contact, GraphNodeResponse(id=contact, label=contact, node_type="CONTACT", score=0.5))
                participants = people if people else [owner]
                for participant in participants:
                    if participant != contact:
                        contact_participants[contact].add(participant)
                if event_id:
                    contact_event_ids[contact].add(event_id)

        shared_point_map: dict[tuple[str, str], set[str]] = defaultdict(set)

        for location, participants in location_participants.items():
            if len(participants) >= 2 and len(location_event_ids[location]) <= 2:
                for a, b in combinations(sorted(participants), 2):
                    self._add_edge(
                        edge_map,
                        a,
                        b,
                        "shared unusual location visits",
                        *sorted(location_event_ids[location]),
                    )
                    shared_point_map[(a, b)].add(f"location:{location}")

        for network, participants in wifi_participants.items():
            if len(participants) >= 2 and len(wifi_event_ids[network]) <= 2:
                for a, b in combinations(sorted(participants), 2):
                    self._add_edge(
                        edge_map,
                        a,
                        b,
                        "same rare WiFi network usage",
                        *sorted(wifi_event_ids[network]),
                    )
                    shared_point_map[(a, b)].add(f"wifi:{network}")

        for contact, participants in contact_participants.items():
            if len(participants) >= 2 and len(contact_event_ids[contact]) <= 3:
                for a, b in combinations(sorted(participants), 2):
                    self._add_edge(
                        edge_map,
                        a,
                        b,
                        "shared uncommon contact",
                        *sorted(contact_event_ids[contact]),
                    )
                    shared_point_map[(a, b)].add(f"contact:{contact}")

        person_nodes = [
            node.id
            for node in nodes.values()
            if node.node_type in {"PERSON", "DEVICE_OWNER"}
        ]
        adjacency = self._build_adjacency(edge_map)
        indirect_paths = self._find_indirect_paths(adjacency, person_nodes)

        hidden_clusters: list[HiddenClusterResponse] = []
        for (a, b), shared_points in sorted(shared_point_map.items(), key=lambda item: len(item[1]), reverse=True):
            if len(shared_points) < 2:
                continue
            points_sorted = sorted(shared_points)
            hidden_clusters.append(
                HiddenClusterResponse(
                    persons=[a, b],
                    shared_points=points_sorted,
                    interaction_count=len(points_sorted),
                    message=f"These two individuals appear unrelated but share {len(points_sorted)} hidden interaction points.",
                )
            )

        highlights: list[str] = []
        if hidden_clusters:
            top = hidden_clusters[0]
            highlights.append(
                f"These two individuals appear unrelated but share {top.interaction_count} hidden interaction points."
            )
        else:
            highlights.append("No high-confidence hidden interaction cluster detected in current case evidence.")
        if indirect_paths:
            highlights.append(f"Detected {len(indirect_paths)} indirect connection path(s), including chain-style links.")

        return ConnectionGraphResponse(
            case_id=case_id,
            nodes=sorted(nodes.values(), key=lambda item: (item.node_type, item.label))[:160],
            edges=sorted(edge_map.values(), key=lambda item: item.weight, reverse=True)[:300],
            indirect_paths=indirect_paths,
            hidden_clusters=hidden_clusters[:20],
            highlights=highlights,
        )

    async def _classify_entities_with_llm(self, labels: list[str]) -> dict[str, EntityType]:
        classified: dict[str, EntityType] = {}
        for label in labels:
            classified[label] = self._heuristic_entity_type(label)

        if not labels:
            return classified

        # Use LLM only to refine labels that are ambiguous or currently heuristic PERSON/OTHER.
        refine = [label for label in labels if classified.get(label) in {"PERSON", "OTHER"}][:120]
        if not refine:
            return classified

        llm_data = await self.llm_service.structured_json(
            task_prompt=(
                "Classify each entity label for forensic graph analysis.\n"
                "Allowed types: PERSON, LOCATION, WIFI_NETWORK, CONTACT, DEVICE_OWNER, OTHER.\n"
                "Do not infer guilt, only entity semantics.\n"
                f"Labels: {refine}\n"
            ),
            schema_hint={
                "entities": [
                    {"label": "string", "entity_type": "PERSON|LOCATION|WIFI_NETWORK|CONTACT|DEVICE_OWNER|OTHER"}
                ]
            },
            temperature=0.0,
        )

        rows = llm_data.get("entities", []) if isinstance(llm_data, dict) else []
        if isinstance(rows, list):
            for item in rows:
                if not isinstance(item, dict):
                    continue
                label = str(item.get("label", "")).strip()
                entity_type = str(item.get("entity_type", "")).strip().upper()
                if label in classified and entity_type in ALLOWED_ENTITY_TYPES:
                    classified[label] = entity_type

        return classified

    def _heuristic_entity_type(self, label: str) -> EntityType:
        lower = label.lower()
        if lower == "primary device":
            return "DEVICE_OWNER"
        if any(token in lower for token in ("wifi", "ssid", "hotspot", "wlan")):
            return "WIFI_NETWORK"
        if any(token in lower for token in ("cell tower", "expressway", "highway", "bazaar", "mumbai", "road", "street", "gps", "maps", "location", "exit")):
            return "LOCATION"
        if re.search(r"\+\d{7,}", lower):
            return "CONTACT"
        if any(token in lower for token in ("unknown prepaid", "prepaid", "number")):
            return "CONTACT"
        # Assume short alias-like values are likely persons unless location heuristics matched.
        if len(label.split()) <= 3:
            return "PERSON"
        return "OTHER"

    def _parse_fields(self, raw_text: str) -> dict[str, str]:
        parts = [item.strip() for item in raw_text.split("|") if item.strip()]
        fields: dict[str, str] = {}
        for part in parts:
            if ":" not in part:
                continue
            key, value = part.split(":", 1)
            key = key.strip().lower()
            value = value.strip()
            if key and value:
                fields[key] = value
        return fields

    def _extract_people(self, raw_text: str, fields: dict[str, str]) -> list[str]:
        people: set[str] = set()
        for key in ("contact_name", "sender", "receiver", "name"):
            value = fields.get(key)
            if value:
                people.add(self._normalize_label(value))

        if not people:
            for token in re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b", raw_text):
                clean = self._normalize_label(token)
                if clean.lower() in {"device", "power", "off", "search", "incoming", "outgoing", "unknown"}:
                    continue
                if len(clean) >= 3:
                    people.add(clean)
                if len(people) >= 4:
                    break
        return sorted(people)

    def _extract_locations(self, fields: dict[str, str]) -> list[str]:
        locations: list[str] = []
        for key in ("resolved_address", "location"):
            value = fields.get(key)
            if value:
                locations.append(self._normalize_label(value))
        return locations

    def _extract_wifi_networks(self, fields: dict[str, str], raw_text: str) -> list[str]:
        networks: set[str] = set()
        for key in ("ssid", "wifi_network", "network"):
            value = fields.get(key)
            if value and "wifi" in key:
                networks.add(self._normalize_label(value))
        for match in re.findall(r"wifi(?:\s*network)?[:\s-]+([A-Za-z0-9_.-]+)", raw_text, flags=re.IGNORECASE):
            networks.add(self._normalize_label(match))
        return sorted(networks)

    def _extract_contacts(self, fields: dict[str, str]) -> list[str]:
        values: list[str] = []
        for key in ("contact_name", "sender", "receiver", "phone_number"):
            value = fields.get(key)
            if value:
                values.append(self._normalize_label(value))
        return values

    def _normalize_label(self, value: str) -> str:
        return re.sub(r"\s+", " ", value.strip()).strip('"')

    def _add_edge(
        self,
        edge_map: dict[tuple[str, str, str], GraphEdgeResponse],
        source: str,
        target: str,
        relation: str,
        *event_ids: str,
    ) -> None:
        if source == target:
            return
        left, right = sorted([source, target])
        key = (left, right, relation)
        event_id_list = [item for item in event_ids if item]
        if key not in edge_map:
            edge_map[key] = GraphEdgeResponse(
                source=left,
                target=right,
                relation=relation,
                weight=1.0,
                evidence_event_ids=event_id_list,
            )
            return
        edge = edge_map[key]
        edge.weight += 1.0
        known = set(edge.evidence_event_ids)
        for event_id in event_id_list:
            if event_id not in known:
                edge.evidence_event_ids.append(event_id)
                known.add(event_id)

    def _build_adjacency(self, edge_map: dict[tuple[str, str, str], GraphEdgeResponse]) -> dict[str, set[str]]:
        adjacency: dict[str, set[str]] = defaultdict(set)
        for edge in edge_map.values():
            adjacency[edge.source].add(edge.target)
            adjacency[edge.target].add(edge.source)
        return adjacency

    def _find_indirect_paths(self, adjacency: dict[str, set[str]], persons: list[str]) -> list[list[str]]:
        paths: list[list[str]] = []
        for start in persons:
            queue: deque[tuple[str, list[str]]] = deque([(start, [start])])
            while queue and len(paths) < 20:
                node, path = queue.popleft()
                if len(path) > 4:
                    continue
                for nxt in sorted(adjacency.get(node, set())):
                    if nxt in path:
                        continue
                    new_path = path + [nxt]
                    if len(new_path) >= 4 and new_path not in paths:
                        paths.append(new_path)
                    queue.append((nxt, new_path))
        return paths[:20]
