'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { insightService } from '@/services/insightService';
import type { InsightResponse } from '@/types/api';

type Props = {
  caseId: string;
  insights: InsightResponse[];
};

const confidenceClass = (score: number) => {
  if (score >= 0.8) return 'text-red-700 bg-red-50 border-red-200';
  if (score >= 0.5) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-blue-700 bg-blue-50 border-blue-200';
};

export default function InsightsEngineView({ caseId, insights }: Props) {
  const [rows, setRows] = useState<InsightResponse[]>(insights);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setRows(insights);
    setError('');
  }, [caseId, insights]);

  const selected = rows[0];
  const contradictionTypes = useMemo(
    () =>
      (selected?.contradiction_type || '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    [selected?.contradiction_type]
  );

  const reasoningBullets = useMemo(
    () =>
      (selected?.ai_reasoning || '')
        .split(/[\n.]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 7),
    [selected?.ai_reasoning]
  );

  const handleRegenerate = async () => {
    if (!caseId) {
      setError('Select or upload a case first.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const result = await insightService.regenerateInsights(caseId);
      setRows([result.insight]);
    } catch {
      setError('Failed to regenerate insights. You may need ADMIN/SUPER_ADMIN access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-white border border-slate-200 rounded-xl shadow-sm p-6 animate-in fade-in duration-500 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Investigative Insights Engine</h2>
          <p className="text-sm text-slate-500 mt-1">Contradiction and behavioral pattern analysis with AI-assisted confidence scoring.</p>
        </div>
        <button
          onClick={() => void handleRegenerate()}
          disabled={loading}
          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded text-sm disabled:opacity-60"
        >
          {loading ? 'Regenerating...' : 'Regenerate Insight'}
        </button>
      </div>

      <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50 text-sm text-indigo-700">
        Insights are probabilistic and investigative-only. They do not determine guilt or legal conclusions.
      </div>

      {error ? (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      ) : null}

      {!selected ? (
        <div className="p-6 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
          No insights available for this case yet.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded border px-3 py-1 text-xs font-semibold ${confidenceClass(selected.confidence_score)}`}>
              Confidence: {Math.round(selected.confidence_score * 100)}%
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Insight Summary</p>
            <p className="text-sm text-slate-700 mt-2">{selected.summary}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700">Contradictions / Patterns</p>
              <ul className="mt-2 space-y-2">
                {(contradictionTypes.length ? contradictionTypes : ['no_strong_contradiction_detected']).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700">AI-Assisted Reasoning</p>
              <ul className="mt-2 space-y-2">
                {reasoningBullets.map((item, idx) => (
                  <li key={`${item}-${idx}`} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 mt-2 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">Supporting Event References</p>
            <p className="text-xs text-slate-500 mt-1">Count: {selected.supporting_event_ids.length}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {selected.supporting_event_ids.slice(0, 20).map((eventId) => (
                <span key={eventId} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 font-mono">
                  {eventId}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
