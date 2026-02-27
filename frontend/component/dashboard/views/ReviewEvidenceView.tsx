'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Search } from 'lucide-react';
import type { EvidenceResponse } from '@/types/api';

type Props = {
  evidence: EvidenceResponse | null;
};

type RiskFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
const FALLBACK_CLUSTERS = [
  {
    id: 'none',
    anomaly_type: 'No Evidence',
    risk_score: 0,
    reasoning: 'No evidence clusters available.',
    related_event_ids: [],
    related_events: [],
  },
];

const formatBullets = (text: string): string[] => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  return cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const toPriority = (score: number): Exclude<RiskFilter, 'ALL'> => {
  if (score >= 0.8) return 'HIGH';
  if (score >= 0.6) return 'MEDIUM';
  return 'LOW';
};

const normalizeFieldLabel = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const parseEventRawText = (rawText: string) => {
  const fields: Array<{ key: string; value: string }> = [];
  const notes: string[] = [];
  const parts = rawText
    .split('|')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  for (const part of parts) {
    const index = part.indexOf(':');
    if (index > 0) {
      const rawKey = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (!rawKey || !value) continue;
      fields.push({ key: normalizeFieldLabel(rawKey), value });
    } else {
      notes.push(part);
    }
  }

  return { fields, notes };
};

export default function ReviewEvidenceView({ evidence }: Props) {
  const clusters = evidence?.clusters?.length ? evidence.clusters : FALLBACK_CLUSTERS;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('ALL');
  const [query, setQuery] = useState('');

  const riskLabel = (score: number) => {
    if (score >= 0.8) return 'High Priority';
    if (score >= 0.6) return 'Medium Priority';
    return 'Low Priority';
  };
  const riskClass = (score: number) => {
    if (score >= 0.8) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 0.6) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  const filteredClusters = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clusters.filter((cluster) => {
      const matchesRisk = riskFilter === 'ALL' || toPriority(cluster.risk_score) === riskFilter;
      const matchesQuery =
        !q ||
        cluster.anomaly_type.toLowerCase().includes(q) ||
        cluster.reasoning.toLowerCase().includes(q) ||
        cluster.related_events.some((event) => event.raw_text.toLowerCase().includes(q));
      return matchesRisk && matchesQuery;
    });
  }, [clusters, query, riskFilter]);

  const selectedCluster = useMemo(() => {
    const byId = filteredClusters.find((item) => item.id === selectedId);
    return byId ?? filteredClusters[0] ?? clusters[0];
  }, [clusters, filteredClusters, selectedId]);

  const reasoningBullets = useMemo(() => formatBullets(selectedCluster?.reasoning || ''), [selectedCluster?.reasoning]);

  return (
    <div className="h-full grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-6 animate-in fade-in duration-500">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[620px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <p className="font-semibold text-slate-800">Flagged Anomalies</p>
          <p className="text-xs text-slate-500 mt-1">Review and prioritize suspicious clusters quickly.</p>
          <div className="mt-3 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anomaly or evidence text..."
              className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as RiskFilter[]).map((item) => (
              <button
                key={item}
                onClick={() => setRiskFilter(item)}
                className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                  riskFilter === item ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredClusters.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                selectedCluster?.id === item.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="text-xs font-bold text-red-600">{riskLabel(item.risk_score)}</span>
                <span className="text-xs text-slate-400">{Math.round(item.risk_score * 100)}%</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{item.anomaly_type}</p>
              <p className="text-xs text-slate-500 mt-1">Linked events: {item.related_event_ids.length}</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full ${
                    item.risk_score >= 0.8 ? 'bg-red-500' : item.risk_score >= 0.6 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.round(item.risk_score * 100)}%` }}
                />
              </div>
            </button>
          ))}
          {!filteredClusters.length ? <p className="text-sm text-slate-500 p-3">No anomalies match your filter.</p> : null}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 md:p-8 flex flex-col min-h-[620px]">
        <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">{selectedCluster?.anomaly_type || 'No Evidence'}</h2>
            <p className="text-sm text-slate-500 mt-1">Source: Risk Score / Cluster ID: {selectedCluster?.id || 'N/A'}</p>
          </div>
          <button className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors whitespace-nowrap">
            <CheckCircle2 className="w-4 h-4" /> Add to Report
          </button>
        </div>
        <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-4 md:p-6 overflow-y-auto space-y-5">
          <div className={`inline-flex items-center px-3 py-1 rounded border text-xs font-semibold ${riskClass(selectedCluster?.risk_score ?? 0)}`}>
            Risk Score: {Math.round((selectedCluster?.risk_score ?? 0) * 100)}%
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">AI/Rule Reasoning</p>
            <ul className="mt-3 space-y-2.5">
              {reasoningBullets.length ? reasoningBullets.map((item, idx) => (
                <li key={`${item}-${idx}`} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                  <span><span className="font-semibold text-slate-900">Insight:</span> {item}</span>
                </li>
              )) : (
                <li className="text-sm text-slate-500">No details available.</li>
              )}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800 mb-2">Connected Digital Events</p>
            <div className="space-y-2.5">
              {(selectedCluster?.related_events ?? []).map((event) => (
                <details key={event.id} className="group bg-white border border-slate-200 rounded-md p-3 open:border-blue-200 open:bg-blue-50/40">
                  <summary className="list-none cursor-pointer">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{event.event_type}</span>
                        <span className="text-xs text-slate-500 font-mono">{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {(() => {
                      const parsed = parseEventRawText(event.raw_text);
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {parsed.fields.map((field, idx) => (
                              <div key={`${field.key}-${idx}`} className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{field.key}</p>
                                <p className="mt-1 text-sm leading-relaxed text-slate-700 break-words">{field.value}</p>
                              </div>
                            ))}
                          </div>

                          {parsed.notes.length ? (
                            <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Notes</p>
                              <ul className="mt-1.5 space-y-1.5">
                                {parsed.notes.map((note, idx) => (
                                  <li key={`${note}-${idx}`} className="text-sm leading-relaxed text-indigo-900">
                                    {note}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {!parsed.fields.length && !parsed.notes.length ? (
                            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                              <p className="text-sm leading-relaxed text-slate-700 break-words">{event.raw_text}</p>
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                </details>
              ))}
              {!(selectedCluster?.related_events ?? []).length ? (
                <p className="text-sm text-slate-500">No linked event details available.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
