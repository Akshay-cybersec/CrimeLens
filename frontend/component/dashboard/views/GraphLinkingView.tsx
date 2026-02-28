'use client';

import React, { useMemo, useState } from 'react';
import type { ConnectionGraphResponse, TimelineResponse } from '@/types/api';

type Props = {
  graph: ConnectionGraphResponse | null;
  timeline?: TimelineResponse | null;
};

type NodeKind = 'PERSON' | 'TOOL' | 'PLATFORM' | 'DEVICE' | 'ACCOUNT' | 'LOCATION' | 'OWNER' | 'OTHER';

type SemanticNode = {
  id: string;
  label: string;
  kind: NodeKind;
  score: number;
};

type SemanticEdge = {
  source: string;
  target: string;
  relation: string;
  weight: number;
  evidence: string[];
};

type Point = { x: number; y: number };

const parseFields = (rawText: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  rawText
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((part) => {
      const idx = part.indexOf(':');
      if (idx > 0) {
        const key = part.slice(0, idx).trim().toLowerCase();
        const value = part.slice(idx + 1).trim();
        if (key && value) fields[key] = value;
      }
    });
  return fields;
};

const norm = (value: string) => value.replace(/\s+/g, ' ').trim();

const pick = (fields: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = fields[key];
    if (value && value.trim()) return norm(value);
  }
  return null;
};

const nodeColor = (kind: NodeKind) => {
  if (kind === 'PERSON') return '#2563eb';
  if (kind === 'TOOL') return '#ef4444';
  if (kind === 'PLATFORM') return '#14b8a6';
  if (kind === 'DEVICE') return '#f59e0b';
  if (kind === 'ACCOUNT') return '#8b5cf6';
  if (kind === 'LOCATION') return '#22c55e';
  if (kind === 'OWNER') return '#0f172a';
  return '#64748b';
};

const edgeColor = (relation: string) => {
  const lower = relation.toLowerCase();
  if (lower.includes('contact') || lower.includes('message')) return '#2563eb';
  if (lower.includes('tor') || lower.includes('crypto') || lower.includes('sim')) return '#ef4444';
  if (lower.includes('platform') || lower.includes('cloud')) return '#14b8a6';
  if (lower.includes('device')) return '#f59e0b';
  return '#64748b';
};

const nodeTextLines = (label: string, maxCharsPerLine = 16): string[] => {
  const clean = label.replace(/^tool:|^platform:|^device:|^location:/i, '').trim();
  if (!clean) return ['Unknown'];
  const words = clean.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length <= maxCharsPerLine) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
};

const laneX = (kind: NodeKind, width: number) => {
  if (kind === 'OWNER' || kind === 'PERSON') return width * 0.14;
  if (kind === 'PLATFORM' || kind === 'ACCOUNT' || kind === 'TOOL') return width * 0.42;
  if (kind === 'DEVICE') return width * 0.7;
  if (kind === 'LOCATION') return width * 0.88;
  return width * 0.55;
};

const createEdgeKey = (a: string, b: string, relation: string) => `${a}__${b}__${relation}`;

const buildSemanticGraph = (timeline?: TimelineResponse | null): { nodes: SemanticNode[]; edges: SemanticEdge[]; highlights: string[] } => {
  const events = timeline?.timeline ?? [];
  if (!events.length) return { nodes: [], edges: [], highlights: [] };

  const nodesMap = new Map<string, SemanticNode>();
  const edgesMap = new Map<string, SemanticEdge>();
  const profile = { victim: '', suspect: '', secondaryVictim: '' };

  const addNode = (id: string, label: string, kind: NodeKind, score = 0.6) => {
    if (!id) return;
    const existing = nodesMap.get(id);
    if (!existing) {
      nodesMap.set(id, { id, label, kind, score });
      return;
    }
    existing.score = Math.max(existing.score, score);
    if (existing.kind === 'OTHER' && kind !== 'OTHER') existing.kind = kind;
  };

  const addEdge = (source: string, target: string, relation: string, evidenceId?: string) => {
    if (!source || !target || source === target) return;
    const [a, b] = source < target ? [source, target] : [target, source];
    const key = createEdgeKey(a, b, relation);
    const existing = edgesMap.get(key);
    if (!existing) {
      edgesMap.set(key, {
        source: a,
        target: b,
        relation,
        weight: 1,
        evidence: evidenceId ? [evidenceId] : [],
      });
      return;
    }
    existing.weight += 1;
    if (evidenceId && !existing.evidence.includes(evidenceId)) existing.evidence.push(evidenceId);
  };

  addNode('Primary Device Owner', 'Primary Device Owner', 'OWNER', 1);

  events.forEach((event) => {
    const fields = parseFields(event.raw_text || '');
    const lower = (event.raw_text || '').toLowerCase();
    const role = (fields.role || '').toLowerCase();
    const profileName = pick(fields, ['name', 'contact_name', 'person', 'owner_name']);
    if (profileName) {
      if (role === 'victim') profile.victim = profile.victim || profileName;
      if (role === 'suspect') profile.suspect = profile.suspect || profileName;
      if (role === 'secondary_victim') profile.secondaryVictim = profile.secondaryVictim || profileName;
    }

    const from = pick(fields, ['from', 'sender', 'owner', 'caller', 'source']) || profileName || 'Primary Device Owner';
    const to = pick(fields, ['to', 'receiver', 'target', 'callee', 'contact', 'contact_to']);
    const eventId = event.id;

    addNode(from, from, from === 'Primary Device Owner' ? 'OWNER' : 'PERSON', 0.8);

    if (to) {
      addNode(to, to, 'PERSON', 0.75);
      addEdge(from, to, 'contacted', eventId);
    }

    const deviceModel = pick(fields, ['device_model', 'device', 'mobile', 'phone']);
    if (deviceModel) {
      addNode(`device:${deviceModel}`, deviceModel, 'DEVICE', 0.75);
      addEdge(from, `device:${deviceModel}`, 'used device', eventId);
    } else if (lower.includes('mobile') || lower.includes('phone')) {
      addNode('device:Mobile Device', 'Mobile Device', 'DEVICE', 0.65);
      addEdge(from, 'device:Mobile Device', 'used device', eventId);
    }

    if (lower.includes('tor')) {
      addNode('tool:TOR Browser', 'TOR Browser', 'TOOL', 0.9);
      addEdge(from, 'tool:TOR Browser', 'accessed tor', eventId);
    }
    if (lower.includes('telegram')) {
      addNode('platform:Telegram', 'Telegram', 'PLATFORM', 0.85);
      addEdge(from, 'platform:Telegram', 'used platform', eventId);
    }
    if (lower.includes('whatsapp')) {
      addNode('platform:WhatsApp', 'WhatsApp', 'PLATFORM', 0.8);
      addEdge(from, 'platform:WhatsApp', 'used platform', eventId);
    }
    if (lower.includes('google drive') || lower.includes('cloud_download') || lower.includes('drive export')) {
      addNode('platform:Google Drive', 'Google Drive', 'PLATFORM', 0.88);
      addEdge(from, 'platform:Google Drive', 'accessed cloud data', eventId);
    }
    if (lower.includes('anonymous gmail') || (lower.includes('gmail') && lower.includes('anonymous'))) {
      addNode('account:Anonymous Gmail', 'Anonymous Gmail', 'ACCOUNT', 0.9);
      addEdge(from, 'account:Anonymous Gmail', 'created account', eventId);
    }
    if (lower.includes('crypto') || lower.includes('ethereum') || lower.includes('wallet')) {
      addNode('tool:Crypto Wallet', 'Crypto Wallet', 'TOOL', 0.88);
      addEdge(from, 'tool:Crypto Wallet', 'created/used crypto wallet', eventId);
    }
    if (lower.includes('sim swap') || lower.includes('sim_swap')) {
      addNode('tool:SIM Swap Event', 'SIM Swap Event', 'TOOL', 0.9);
      addEdge(from, 'tool:SIM Swap Event', 'performed sim swap', eventId);
    }
    if (lower.includes('location') || lower.includes('resolved_address')) {
      const location = pick(fields, ['resolved_address', 'location']);
      if (location) {
        addNode(`location:${location}`, location, 'LOCATION', 0.7);
        addEdge(from, `location:${location}`, 'appeared at location', eventId);
      }
    }
  });

  if (profile.victim) addNode(profile.victim, profile.victim, 'PERSON', 0.95);
  if (profile.suspect) addNode(profile.suspect, profile.suspect, 'PERSON', 0.95);
  if (profile.secondaryVictim) addNode(profile.secondaryVictim, profile.secondaryVictim, 'PERSON', 0.85);

  const highlights: string[] = [];
  if (profile.suspect && edgesMap.size) highlights.push(`Suspect-centric links detected for ${profile.suspect}.`);
  if ([...nodesMap.values()].some((n) => n.label === 'TOR Browser')) highlights.push('TOR Browser usage linkage detected.');
  if ([...nodesMap.values()].some((n) => n.label === 'Crypto Wallet')) highlights.push('Crypto wallet activity is connected in the graph.');
  if ([...nodesMap.values()].some((n) => n.label === 'Google Drive')) highlights.push('Cloud data access path is represented.');

  return {
    nodes: [...nodesMap.values()].slice(0, 180),
    edges: [...edgesMap.values()].sort((a, b) => b.weight - a.weight).slice(0, 300),
    highlights,
  };
};

export default function GraphLinkingView({ graph, timeline }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const semantic = useMemo(() => buildSemanticGraph(timeline), [timeline]);
  const backendNodes = graph?.nodes ?? [];
  const backendEdges = graph?.edges ?? [];
  const backendHighlights = graph?.highlights ?? [];

  const useSemantic = semantic.nodes.length > 0;
  const nodes = useSemantic
    ? semantic.nodes
    : backendNodes.map((n) => ({
        id: n.id,
        label: n.label,
        kind: (n.node_type === 'PERSON' ? 'PERSON' : n.node_type === 'LOCATION' ? 'LOCATION' : 'OTHER') as NodeKind,
        score: n.score,
      }));
  const edges = useSemantic
    ? semantic.edges
    : backendEdges.map((e) => ({
        source: e.source,
        target: e.target,
        relation: e.relation,
        weight: e.weight,
        evidence: e.evidence_event_ids,
      }));
  const highlights = useSemantic ? semantic.highlights : backendHighlights;

  const degreeMap = useMemo(() => {
    const map = new Map<string, number>();
    edges.forEach((edge) => {
      map.set(edge.source, (map.get(edge.source) ?? 0) + 1);
      map.set(edge.target, (map.get(edge.target) ?? 0) + 1);
    });
    return map;
  }, [edges]);

  const layout = useMemo(() => {
    const width = 1320;
    const height = 760;
    const positions = new Map<string, Point>();
    const groups: Record<NodeKind, SemanticNode[]> = {
      OWNER: [],
      PERSON: [],
      TOOL: [],
      PLATFORM: [],
      ACCOUNT: [],
      DEVICE: [],
      LOCATION: [],
      OTHER: [],
    };

    nodes.forEach((node) => groups[node.kind].push(node));
    (Object.keys(groups) as NodeKind[]).forEach((kind) => {
      const list = groups[kind];
      const x = laneX(kind, width);
      const step = height / (Math.max(1, list.length) + 1);
      list.forEach((node, idx) => positions.set(node.id, { x, y: step * (idx + 1) }));
    });

    return { width, height, positions };
  }, [nodes]);

  const selectedNode = useMemo(() => nodes.find((item) => item.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((item) => createEdgeKey(item.source, item.target, item.relation) === selectedEdgeId) ?? null, [edges, selectedEdgeId]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>([selectedNodeId]);
    edges.forEach((edge) => {
      if (edge.source === selectedNodeId) ids.add(edge.target);
      if (edge.target === selectedNodeId) ids.add(edge.source);
    });
    return ids;
  }, [edges, selectedNodeId]);

  const handleWheel: React.WheelEventHandler<SVGSVGElement> = (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.45, Math.min(2.6, Number((prev + delta).toFixed(2)))));
  };

  const startPan: React.MouseEventHandler<SVGSVGElement> = (event) => {
    setIsPanning(true);
    setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  };

  const movePan: React.MouseEventHandler<SVGSVGElement> = (event) => {
    if (!isPanning) return;
    setPan({ x: event.clientX - panStart.x, y: event.clientY - panStart.y });
  };

  const endPan = () => setIsPanning(false);

  const relationStats = useMemo(() => {
    const torLinks = edges.filter((e) => e.relation.toLowerCase().includes('tor')).length;
    const contactLinks = edges.filter((e) => e.relation.toLowerCase().includes('contact')).length;
    const deviceLinks = edges.filter((e) => e.relation.toLowerCase().includes('device')).length;
    return { torLinks, contactLinks, deviceLinks };
  }, [edges]);

  return (
    <div className="h-full flex gap-6 animate-in fade-in duration-500">
      <div className="w-[360px] bg-white border border-slate-200 rounded-xl shadow-sm p-4 overflow-y-auto space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Semantic Link Graph</h2>
          <p className="text-xs text-slate-500 mt-1">Human-readable links: person {'->'} TOR/platform {'->'} device/contact.</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border border-red-200 bg-red-50 px-2 py-2">
            <p className="text-[10px] uppercase text-red-700 font-semibold">TOR</p>
            <p className="text-sm font-bold text-red-800">{relationStats.torLinks}</p>
          </div>
          <div className="rounded border border-blue-200 bg-blue-50 px-2 py-2">
            <p className="text-[10px] uppercase text-blue-700 font-semibold">Contact</p>
            <p className="text-sm font-bold text-blue-800">{relationStats.contactLinks}</p>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 px-2 py-2">
            <p className="text-[10px] uppercase text-amber-700 font-semibold">Device</p>
            <p className="text-sm font-bold text-amber-800">{relationStats.deviceLinks}</p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <h3 className="text-sm font-semibold text-slate-700">Highlights</h3>
          <ul className="mt-2 space-y-2">
            {highlights.map((item, idx) => (
              <li key={`${item}-${idx}`} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-600" />
                <span>{item}</span>
              </li>
            ))}
            {!highlights.length ? <li className="text-sm text-slate-500">No highlights available.</li> : null}
          </ul>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">Graph Linking Map</h3>
          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" /> Person</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Tool (TOR/Crypto/SIM)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> Platform</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Device</span>
            <div className="ml-2 flex items-center gap-1">
              <button onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))))} className="px-2 py-0.5 rounded border border-slate-300">-</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedNodeId(null); setSelectedEdgeId(null); }} className="px-2 py-0.5 rounded border border-slate-300">Reset</button>
              <button onClick={() => setZoom((z) => Math.min(2.6, Number((z + 0.15).toFixed(2))))} className="px-2 py-0.5 rounded border border-slate-300">+</button>
            </div>
          </div>
        </div>

        {!nodes.length ? (
          <div className="text-sm text-slate-500">No graph/timeline data available for this case.</div>
        ) : (
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="w-full h-[760px] rounded-lg border border-slate-200 bg-slate-50 select-none cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={startPan}
            onMouseMove={movePan}
            onMouseUp={endPan}
            onMouseLeave={endPan}
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {edges.map((edge, idx) => {
                const a = layout.positions.get(edge.source);
                const b = layout.positions.get(edge.target);
                if (!a || !b) return null;
                const edgeKey = createEdgeKey(edge.source, edge.target, edge.relation);
                const selected = selectedEdgeId === edgeKey;
                const activeByNode = selectedNodeId ? (edge.source === selectedNodeId || edge.target === selectedNodeId) : true;
                const opacity = selected ? 1 : activeByNode ? 0.75 : 0.16;
                const dx = (b.x - a.x) * 0.5;
                const dy = (idx % 2 === 0 ? -1 : 1) * Math.min(30, 8 + Math.abs(b.y - a.y) * 0.12);
                const cx = a.x + dx;
                const cy = a.y + dy;
                return (
                  <g key={`${edgeKey}-${idx}`} onClick={() => setSelectedEdgeId(edgeKey)}>
                    <path
                      d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                      fill="none"
                      stroke={edgeColor(edge.relation)}
                      strokeWidth={Math.min(5, 1.1 + edge.weight * 0.7)}
                      opacity={opacity}
                    />
                  </g>
                );
              })}

              {nodes.map((node) => {
                const point = layout.positions.get(node.id);
                if (!point) return null;
                const degree = degreeMap.get(node.id) ?? 0;
                const selected = selectedNodeId === node.id;
                const connected = selectedNodeId ? connectedNodeIds.has(node.id) : true;
                const opacity = selectedNodeId ? (connected ? 1 : 0.2) : 1;
                const lines = nodeTextLines(node.label, 16);
                const radius = Math.max(44, Math.min(78, 46 + degree * 1.5 + lines.length * 4));
                return (
                  <g key={node.id} onClick={() => { setSelectedNodeId(node.id); setSelectedEdgeId(null); }}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={radius}
                      fill={nodeColor(node.kind)}
                      stroke={selected ? '#111827' : '#ffffff'}
                      strokeWidth={selected ? 3 : 1.5}
                      opacity={opacity}
                    />
                    {lines.map((line, idx) => (
                      <text
                        key={`${node.id}-line-${idx}`}
                        x={point.x}
                        y={point.y - ((lines.length - 1) * 7) + idx * 14}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill="#111827"
                        opacity={opacity}
                        pointerEvents="none"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Selected Node</p>
            <p className="text-sm text-slate-700 mt-1">{selectedNode ? `${selectedNode.label} (${selectedNode.kind})` : 'Click a node to inspect links.'}</p>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Selected Link</p>
            <p className="text-sm text-slate-700 mt-1">
              {selectedEdge ? `${selectedEdge.source} -> ${selectedEdge.target} | ${selectedEdge.relation} | weight ${selectedEdge.weight.toFixed(1)}` : 'Click an edge to inspect relation details.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
