'use client';

import React, { useMemo, useState } from 'react';
import type { ConnectionGraphResponse, GraphEdge, GraphNode } from '@/types/api';

type Props = {
  graph: ConnectionGraphResponse | null;
};

type Point = { x: number; y: number };

const edgeTone = (relation: string) => {
  const lower = relation.toLowerCase();
  if (lower.includes('wifi')) return '#f59e0b';
  if (lower.includes('location')) return '#22c55e';
  if (lower.includes('contact')) return '#8b5cf6';
  return '#64748b';
};

const nodeTone = (nodeType: string) => {
  if (nodeType === 'PERSON') return '#2563eb';
  if (nodeType === 'LOCATION') return '#22c55e';
  if (nodeType === 'WIFI_NETWORK') return '#f59e0b';
  if (nodeType === 'DEVICE_OWNER') return '#0f172a';
  return '#475569';
};

const laneX = (nodeType: string, width: number) => {
  if (nodeType === 'DEVICE_OWNER') return width * 0.12;
  if (nodeType === 'PERSON') return width * 0.3;
  if (nodeType === 'LOCATION') return width * 0.56;
  if (nodeType === 'WIFI_NETWORK') return width * 0.8;
  return width * 0.5;
};

const normalizeSharedPoint = (point: string) => {
  if (!point.includes(':')) return point;
  return point.split(':').slice(1).join(':');
};

export default function GraphLinkingView({ graph }: Props) {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const highlights = graph?.highlights ?? [];
  const clusters = graph?.hidden_clusters ?? [];
  const indirectPaths = graph?.indirect_paths ?? [];
  const [activeCluster, setActiveCluster] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<string | null>(null);

  const selectedCluster = clusters[activeCluster] ?? null;

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
    const groups: Record<string, GraphNode[]> = {
      DEVICE_OWNER: [],
      PERSON: [],
      LOCATION: [],
      WIFI_NETWORK: [],
      OTHER: [],
    };

    for (const node of nodes) {
      if (groups[node.node_type]) groups[node.node_type].push(node);
      else groups.OTHER.push(node);
    }

    Object.entries(groups).forEach(([nodeType, list]) => {
      const x = laneX(nodeType, width);
      const step = height / (Math.max(1, list.length) + 1);
      list.forEach((node, idx) => {
        positions.set(node.id, { x, y: step * (idx + 1) });
      });
    });

    return { width, height, positions };
  }, [nodes]);

  const focusedNodeIds = useMemo(() => {
    if (!selectedCluster) return new Set<string>();
    const ids = new Set<string>();
    selectedCluster.persons.forEach((item) => ids.add(item));
    selectedCluster.shared_points.map(normalizeSharedPoint).forEach((item) => ids.add(item));
    return ids;
  }, [selectedCluster]);

  const rankedEdges = useMemo(() => {
    return [...edges]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 260);
  }, [edges]);

  const selectedNode = useMemo(() => nodes.find((item) => item.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => {
    if (!selectedEdgeKey) return null;
    return rankedEdges.find((edge, idx) => `${edge.source}-${edge.target}-${edge.relation}-${idx}` === selectedEdgeKey) ?? null;
  }, [rankedEdges, selectedEdgeKey]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>([selectedNodeId]);
    rankedEdges.forEach((edge) => {
      if (edge.source === selectedNodeId) ids.add(edge.target);
      if (edge.target === selectedNodeId) ids.add(edge.source);
    });
    return ids;
  }, [rankedEdges, selectedNodeId]);

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

  const graphStats = useMemo(() => {
    const locationEdges = edges.filter((item) => item.relation.toLowerCase().includes('location')).length;
    const wifiEdges = edges.filter((item) => item.relation.toLowerCase().includes('wifi')).length;
    const contactEdges = edges.filter((item) => item.relation.toLowerCase().includes('contact')).length;
    return { locationEdges, wifiEdges, contactEdges };
  }, [edges]);

  return (
    <div className="h-full flex gap-6 animate-in fade-in duration-500">
      <div className="w-[360px] bg-white border border-slate-200 rounded-xl shadow-sm p-4 overflow-y-auto space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Hidden Cluster Insights</h2>
          <p className="text-xs text-slate-500 mt-1">Auto-detected hidden graph clusters and unusual cross-links.</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-2">
            <p className="text-[10px] uppercase text-emerald-700 font-semibold">Location</p>
            <p className="text-sm font-bold text-emerald-800">{graphStats.locationEdges}</p>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 px-2 py-2">
            <p className="text-[10px] uppercase text-amber-700 font-semibold">WiFi</p>
            <p className="text-sm font-bold text-amber-800">{graphStats.wifiEdges}</p>
          </div>
          <div className="rounded border border-violet-200 bg-violet-50 px-2 py-2">
            <p className="text-[10px] uppercase text-violet-700 font-semibold">Contact</p>
            <p className="text-sm font-bold text-violet-800">{graphStats.contactEdges}</p>
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

        <div className="border-t border-slate-200 pt-3">
          <h3 className="text-sm font-semibold text-slate-700">Detected Hidden Clusters</h3>
          <div className="mt-2 space-y-2">
            {clusters.slice(0, 10).map((cluster, idx) => {
              const isActive = idx === activeCluster;
              return (
                <button
                  key={`${cluster.persons.join('-')}-${idx}`}
                  className={`w-full text-left p-2 rounded border transition-colors ${
                    isActive ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                  onClick={() => setActiveCluster(idx)}
                >
                  <p className="text-xs font-semibold text-slate-700">{cluster.persons.join(' ↔ ')}</p>
                  <p className="text-xs text-slate-600 mt-1">{cluster.message}</p>
                </button>
              );
            })}
            {!clusters.length ? <p className="text-xs text-slate-500">No hidden clusters detected.</p> : null}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <h3 className="text-sm font-semibold text-slate-700">Indirect Chains (A→B→C→D)</h3>
          <ul className="mt-2 space-y-1.5">
            {indirectPaths.slice(0, 8).map((path, idx) => (
              <li key={`${path.join('-')}-${idx}`} className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                {path.join(' → ')}
              </li>
            ))}
            {!indirectPaths.length ? <li className="text-xs text-slate-500">No indirect chains detected.</li> : null}
          </ul>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">Graph Linking Map</h3>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" /> Person</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Location</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> WiFi</span>
            <div className="ml-3 flex items-center gap-1">
              <button onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))))} className="px-2 py-0.5 rounded border border-slate-300">-</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedNodeId(null); setSelectedEdgeKey(null); }} className="px-2 py-0.5 rounded border border-slate-300">Reset</button>
              <button onClick={() => setZoom((z) => Math.min(2.6, Number((z + 0.15).toFixed(2))))} className="px-2 py-0.5 rounded border border-slate-300">+</button>
            </div>
          </div>
        </div>

        {!nodes.length ? (
          <div className="text-sm text-slate-500">No graph data available for this case.</div>
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
            <line x1={layout.width * 0.12} y1={0} x2={layout.width * 0.12} y2={layout.height} stroke="#cbd5e1" strokeDasharray="4 4" />
            <line x1={layout.width * 0.3} y1={0} x2={layout.width * 0.3} y2={layout.height} stroke="#cbd5e1" strokeDasharray="4 4" />
            <line x1={layout.width * 0.56} y1={0} x2={layout.width * 0.56} y2={layout.height} stroke="#cbd5e1" strokeDasharray="4 4" />
            <line x1={layout.width * 0.8} y1={0} x2={layout.width * 0.8} y2={layout.height} stroke="#cbd5e1" strokeDasharray="4 4" />

            <text x={layout.width * 0.09} y={18} fontSize="11" fill="#475569">Owner</text>
            <text x={layout.width * 0.27} y={18} fontSize="11" fill="#475569">Persons</text>
            <text x={layout.width * 0.53} y={18} fontSize="11" fill="#475569">Locations</text>
            <text x={layout.width * 0.77} y={18} fontSize="11" fill="#475569">WiFi</text>

            {rankedEdges.map((edge, idx) => {
              const a = layout.positions.get(edge.source);
              const b = layout.positions.get(edge.target);
              if (!a || !b) return null;
              const edgeKey = `${edge.source}-${edge.target}-${edge.relation}-${idx}`;
              const isFocused = focusedNodeIds.size > 0 && focusedNodeIds.has(edge.source) && focusedNodeIds.has(edge.target);
              const focusedByNode = selectedNodeId ? (edge.source === selectedNodeId || edge.target === selectedNodeId) : false;
              const isSelected = selectedEdgeKey === edgeKey;
              const dx = (b.x - a.x) * 0.5;
              const dy = (idx % 2 === 0 ? -1 : 1) * Math.min(24, 6 + Math.abs(b.y - a.y) * 0.12);
              const cx = a.x + dx;
              const cy = a.y + dy;
              const path = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
              const opacity = isSelected ? 1 : (selectedNodeId ? (focusedByNode ? 0.95 : 0.15) : (isFocused ? 0.95 : 0.35));
              return (
                <g key={edgeKey} onClick={() => setSelectedEdgeKey(edgeKey)}>
                  <path
                    d={path}
                    fill="none"
                    stroke={edgeTone(edge.relation)}
                    strokeWidth={Math.min(5, 1 + edge.weight * 0.7)}
                    opacity={opacity}
                  />
                  <path d={path} fill="none" stroke="transparent" strokeWidth={12} />
                </g>
              );
            })}

            {nodes.map((node) => {
              const point = layout.positions.get(node.id);
              if (!point) return null;
              const degree = degreeMap.get(node.id) ?? 0;
              const radius = Math.min(18, 7 + degree * 0.7);
              const focused = focusedNodeIds.size > 0 && focusedNodeIds.has(node.id);
              const selected = selectedNodeId === node.id;
              const connected = selectedNodeId ? connectedNodeIds.has(node.id) : true;
              const opacity = selectedNodeId ? (connected ? 1 : 0.2) : (focusedNodeIds.size > 0 ? (focused ? 1 : 0.55) : 1);
              return (
                <g key={node.id} onClick={() => { setSelectedNodeId(node.id); setSelectedEdgeKey(null); }}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={radius}
                    fill={nodeTone(node.node_type)}
                    stroke={selected ? '#0f172a' : '#ffffff'}
                    strokeWidth={selected ? 3 : 1.2}
                    opacity={opacity}
                  />
                  <text x={point.x + radius + 4} y={point.y + 4} fontSize="11" fill="#0f172a" opacity={opacity}>
                    {node.label.slice(0, 28)}
                  </text>
                </g>
              );
            })}
            </g>
          </svg>
        )}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Selected Node</p>
            <p className="text-sm text-slate-700 mt-1">{selectedNode ? `${selectedNode.label} (${selectedNode.node_type})` : 'Click any node to inspect connected links.'}</p>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Selected Edge</p>
            <p className="text-sm text-slate-700 mt-1">
              {selectedEdge ? `${selectedEdge.source} ↔ ${selectedEdge.target} • ${selectedEdge.relation} • weight ${selectedEdge.weight.toFixed(1)}` : 'Click any edge to inspect relation details.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
