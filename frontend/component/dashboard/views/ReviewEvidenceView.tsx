'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { EvidenceResponse } from '@/types/api';

type Props = {
  evidence: EvidenceResponse | null;
};

export default function ReviewEvidenceView({ evidence }: Props) {
  const clusters = evidence?.clusters ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedCluster = useMemo(() => clusters[selectedIndex] || clusters[0], [clusters, selectedIndex]);
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
  const reasoningBullets = (selectedCluster?.reasoning || '')
    .split(/[\n.]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return (
    <div className="h-full flex gap-6 animate-in fade-in duration-500">
      
      {/* Left Sidebar: Flagged Items List */}
      <div className="w-1/3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl font-semibold text-slate-700">
          Flagged Items ({clusters.length})
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {(clusters.length ? clusters : [{ id: 'none', anomaly_type: 'No Evidence', risk_score: 0, reasoning: 'No evidence clusters available.', related_event_ids: [], related_events: [] }]).map((item, i) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedIndex(i)}
              className={`p-3 rounded-lg cursor-pointer ${
                i === selectedIndex ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-red-600">{riskLabel(item.risk_score)}</span>
                <span className="text-xs text-slate-400">{Math.round(item.risk_score * 100)}%</span>
              </div>
              <p className="text-sm font-medium text-slate-800 truncate">{item.anomaly_type}</p>
              <p className="text-xs text-slate-500 truncate mt-1">Linked events: {item.related_event_ids.length}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Main Panel: Evidence Details */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-8 flex flex-col">
        <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{selectedCluster?.anomaly_type || 'No Evidence'}</h2>
            <p className="text-sm text-slate-500 mt-1">Source: Risk Score / Cluster ID: {selectedCluster?.id || 'N/A'}</p>
          </div>
          <button className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors">
            <CheckCircle2 className="w-4 h-4" /> Add to Report
          </button>
        </div>
        <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-6 overflow-y-auto space-y-4">
          <div className={`inline-flex items-center px-3 py-1 rounded border text-xs font-semibold ${riskClass(selectedCluster?.risk_score ?? 0)}`}>
            Risk Score: {Math.round((selectedCluster?.risk_score ?? 0) * 100)}%
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">AI/Rule Reasoning</p>
            <ul className="mt-2 space-y-1.5">
              {reasoningBullets.length ? reasoningBullets.map((item, idx) => (
                <li key={`${item}-${idx}`} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                  <span>{item}</span>
                </li>
              )) : (
                <li className="text-sm text-slate-500">No details available.</li>
              )}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Connected Digital Events</p>
            <div className="space-y-2">
              {(selectedCluster?.related_events ?? []).map((event) => (
                <div key={event.id} className="bg-white border border-slate-200 rounded-md p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{event.event_type}</span>
                    <span className="text-xs text-slate-500 font-mono">{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-2">{event.raw_text}</p>
                </div>
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
