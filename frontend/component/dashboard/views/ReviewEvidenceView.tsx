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

  return (
    <div className="h-full flex gap-6 animate-in fade-in duration-500">
      
      {/* Left Sidebar: Flagged Items List */}
      <div className="w-1/3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl font-semibold text-slate-700">
          Flagged Items ({clusters.length})
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {(clusters.length ? clusters : [{ id: 'none', anomaly_type: 'No Evidence', risk_score: 0, reasoning: 'No evidence clusters available.', related_event_ids: [] }]).map((item, i) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedIndex(i)}
              className={`p-3 rounded-lg cursor-pointer ${
                i === selectedIndex ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-red-600">{item.risk_score >= 0.7 ? 'High Priority' : 'Medium Priority'}</span>
                <span className="text-xs text-slate-400">{Math.round(item.risk_score * 100)}%</span>
              </div>
              <p className="text-sm font-medium text-slate-800 truncate">{item.anomaly_type}</p>
              <p className="text-xs text-slate-500 truncate mt-1">Found in: {item.related_event_ids[0] || 'N/A'}</p>
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
        <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-6">
          <p className="font-mono text-sm text-slate-700 whitespace-pre-wrap">
            {JSON.stringify(
              {
                anomaly_type: selectedCluster?.anomaly_type || 'No Evidence',
                risk_score: selectedCluster?.risk_score ?? 0,
                related_event_ids: selectedCluster?.related_event_ids || [],
                reasoning: selectedCluster?.reasoning || 'No details available.',
              },
              null,
              2
            )}
          </p>
        </div>
      </div>

    </div>
  );
}
