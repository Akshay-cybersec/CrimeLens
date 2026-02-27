'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, ShieldAlert } from 'lucide-react';
import type { AxiosError } from 'axios';
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

const normalizeLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildSummaryBullets = (summary: string, maxItems = 4): string[] => {
  const cleaned = summary.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const lineCandidates = summary
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim());

  if (lineCandidates.length > 1) {
    return lineCandidates.slice(0, maxItems);
  }

  // Split sentences only when punctuation is followed by a likely new sentence start.
  const sentenceCandidates = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (sentenceCandidates.length <= 1) {
    return [cleaned];
  }

  const merged: string[] = [];
  for (const sentence of sentenceCandidates) {
    if (merged.length > 0 && sentence.length < 28) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${sentence}`;
    } else {
      merged.push(sentence);
    }
  }

  return merged.slice(0, maxItems);
};

type CircleMetricProps = {
  label: string;
  value: number;
  colorClass: string;
};

function CircleMetric({ label, value, colorClass }: CircleMetricProps) {
  const size = 96;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-200" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={`${colorClass} transition-[stroke-dashoffset] duration-700 ease-out`}
            style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800">{clamped}%</div>
      </div>
      <p className="text-xs font-semibold text-slate-700">{label}</p>
    </div>
  );
}

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

  const summaryBullets = useMemo(
    () => buildSummaryBullets(selected?.summary || '', 4),
    [selected?.summary]
  );

  const signalBars = useMemo(() => {
    const confidencePct = Math.round((selected?.confidence_score ?? 0) * 100);
    const contradictionDensity = Math.min(100, contradictionTypes.length * 25);
    const evidenceStrength = Math.min(100, Math.round(((selected?.supporting_event_ids.length ?? 0) / 20) * 100));
    return [
      { label: 'Confidence', value: confidencePct, color: 'stroke-red-500' },
      { label: 'Pattern Density', value: contradictionDensity, color: 'stroke-amber-500' },
      { label: 'Evidence Coverage', value: evidenceStrength, color: 'stroke-blue-500' },
    ];
  }, [selected?.confidence_score, selected?.supporting_event_ids.length, contradictionTypes.length]);

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
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      const status = axiosError.response?.status;
      const detail = axiosError.response?.data?.detail;
      if (status === 429) {
        setError('Insight regeneration is rate-limited. Please wait a moment and try again.');
      } else if (typeof detail === 'string' && detail.trim()) {
        setError(detail);
      } else if (status === 403) {
        setError('You do not have permission to regenerate insights for this case.');
      } else {
        setError('Failed to regenerate insights. Please try again.');
      }
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

      <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50 text-sm leading-relaxed text-indigo-700">
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
            <p className="text-sm font-semibold text-slate-800">Insight Summary</p>
            <ul className="mt-3 space-y-2">
              {(summaryBullets.length ? summaryBullets : [selected.summary]).map((item, idx) => (
                <li key={`${item}-${idx}`} className="text-sm leading-relaxed text-slate-700">
                  <span className="font-bold text-slate-900">Key Point:</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-700" />
              <p className="text-sm font-semibold text-slate-800">Signal Strength Graph</p>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {signalBars.map((bar) => (
                <CircleMetric key={bar.label} label={bar.label} value={bar.value} colorClass={bar.color} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">Contradictions / Patterns</p>
              <ul className="mt-2 space-y-2">
                {(contradictionTypes.length ? contradictionTypes : ['no_strong_contradiction_detected']).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                    <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-600" />
                    <span><span className="font-bold text-slate-900">Pattern:</span> {normalizeLabel(item)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">AI-Assisted Reasoning</p>
              <ul className="mt-2 space-y-2">
                {reasoningBullets.map((item, idx) => (
                  <li key={`${item}-${idx}`} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                    <span className="w-1.5 h-1.5 mt-2 rounded-full bg-blue-600" />
                    <span><span className="font-bold text-slate-900">Reasoning:</span> {item}</span>
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

