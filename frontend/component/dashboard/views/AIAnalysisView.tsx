'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EvidenceResponse, InsightResponse, SimilarCaseResponse, TimelineResponse } from '@/types/api';

interface CrimeEvidence {
  label: string;
  count: number;
  evidence: string;
  type: string;
  timestamp: string;
}

type Props = {
  similarCases?: SimilarCaseResponse[];
  timeline?: TimelineResponse | null;
  insights?: InsightResponse[];
  evidence?: EvidenceResponse | null;
};

function parseRawEventText(rawText: string): { eventTime: Date | null; fields: Record<string, string>; fallback: string } {
  const fields: Record<string, string> = {};
  const parts = rawText.split('|').map((item) => item.trim()).filter(Boolean);
  let eventTime: Date | null = null;

  if (parts.length > 0) {
    const maybeTs = new Date(parts[0]);
    if (!Number.isNaN(maybeTs.getTime())) {
      eventTime = maybeTs;
      parts.shift();
    }
  }

  for (const part of parts) {
    const index = part.indexOf(':');
    if (index > 0) {
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (key && value) {
        fields[key] = value;
      }
    } else if (!fields.action) {
      fields.action = part;
    }
  }

  return { eventTime, fields, fallback: rawText };
}

export default function ForensicTimeline({ timeline, similarCases = [], insights = [], evidence }: Props) {
  const evidenceData = useMemo<CrimeEvidence[]>(() => {
    const timelineEvents = timeline?.timeline ?? [];
    if (!timelineEvents.length) {
      return [
        {
          label: 'N/A',
          count: 120,
          type: 'SYSTEM',
          evidence: 'No parsed events available for this case yet.',
          timestamp: new Date().toLocaleString(),
        },
      ];
    }

    return [...timelineEvents]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((event) => {
      const parsed = parseRawEventText(event.raw_text);
      const baseDate = parsed.eventTime ?? new Date(event.timestamp);
      const label = baseDate.toLocaleString('en-US', { month: 'short', day: '2-digit' });
      const lineLength = Number(event.metadata?.line_length ?? event.raw_text.length ?? 0);
      const count = Math.max(120, Math.min(980, lineLength * 4 + (event.is_deleted ? 120 : 0)));
      const evidence =
        parsed.fields.content ||
        parsed.fields.notes ||
        parsed.fields.query ||
        parsed.fields.flag_reason ||
        parsed.fields.memo ||
        parsed.fields.resolved_address ||
        parsed.fields.action ||
        event.raw_text;

      return {
        label,
        count,
        type: event.event_type || 'Event',
        evidence,
        timestamp: baseDate.toLocaleString(),
      };
    });
  }, [timeline]);

  const [activeStep, setActiveStep] = useState(0);
  const isComplete = activeStep === evidenceData.length - 1;
  const topInsight = insights[0];
  const topClusters = (evidence?.clusters ?? []).slice(0, 3);

  const width = 1000;
  const height = 300;
  const paddingX = 100; // Increased padding to prevent edge cut-off
  const paddingY = 60;

  useEffect(() => {
    setActiveStep(0);
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < evidenceData.length - 1) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 1900);
    return () => clearInterval(timer);
  }, [evidenceData.length]);

  const getX = (index: number) => {
    if (evidenceData.length <= 1) {
      return width / 2;
    }
    return (index * (width - paddingX * 2)) / (evidenceData.length - 1) + paddingX;
  };
  const getY = (value: number) => height - (value * (height - paddingY * 2)) / 1000 - paddingY;

  const generateProgressivePath = (step: number) => {
    let path = `M ${getX(0)} ${getY(evidenceData[0].count)}`;
    for (let i = 1; i <= step; i++) {
      const prevX = getX(i - 1);
      const prevY = getY(evidenceData[i - 1].count);
      const currX = getX(i);
      const currY = getY(evidenceData[i].count);
      const cp1x = prevX + (currX - prevX) / 2;
      const cp2x = prevX + (currX - prevX) / 2;
      path += ` C ${cp1x} ${prevY}, ${cp2x} ${currY}, ${currX} ${currY}`;
    }
    return path;
  };

  return (
    <div className="w-full max-w-6xl mx-auto font-sans text-black p-10 space-y-12">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] text-red-600 uppercase mb-2">Forensic Report</p>
         
        </div>
        
      </div>

      {/* Visual Timeline Area */}
      <div className="relative h-[450px] border-b border-slate-100"> 
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            d={generateProgressivePath(activeStep)}
            fill="none"
            stroke={isComplete ? "#059669" : "#1d4ed8"}
            strokeWidth="4"
            strokeLinecap="round"
            className="transition-colors duration-1000"
          />

          {evidenceData.map((d, i) => (
            <g key={i}>
              <motion.circle
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: i <= activeStep ? 1 : 0.05, 
                  scale: i <= activeStep ? 1 : 0.5,
                  fill: i === activeStep && !isComplete ? "#ef4444" : "#1d4ed8" 
                }}
                cx={getX(i)}
                cy={getY(d.count)}
                r={i === activeStep ? 8 : 5}
              />
              {i === activeStep && !isComplete && (
                <motion.circle
                  cx={getX(i)}
                  cy={getY(d.count)}
                  initial={{ r: 5, opacity: 0.8 }}
                  animate={{ r: 25, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                  className="fill-red-500"
                />
              )}
            </g>
          ))}
        </svg>

        {/* Floating Box Adjustment Logic */}
        {evidenceData.map((item, i) => (
          <AnimatePresence key={i}>
            {i <= activeStep && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`absolute z-10 bg-white border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 w-44 transition-colors duration-500 ${
                  isComplete ? 'border-emerald-500 shadow-emerald-900/20' : 'border-black'
                }`}
                style={{
                  left: `${(getX(i) / width) * 100}%`,
                  top: i % 2 === 0 ? '0%' : '55%', 
                  // Fix for August (Last Box): Shift it left so it doesn't overflow
                  transform: i === evidenceData.length - 1 ? 'translateX(-90%)' : 'translateX(-50%)'
                }}
              >
                <div className="border-b border-slate-100 pb-1 mb-1.5 flex justify-between items-center text-[9px] font-bold">
                  <span className="text-red-600 uppercase">EVIDENCE_{i + 1}</span>
                  <span className="text-slate-400 font-mono uppercase">{item.label}</span>
                </div>
                <p className="text-base font-mono font-bold text-black leading-none">{item.count}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">{item.type} ALERTS</p>
                <p className="text-[10px] font-medium leading-tight text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-100 italic truncate">
                  "{item.evidence}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Persistent Detailed List (Reveals when complete) */}
      <AnimatePresence>
        {isComplete && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-10"
          >
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold font-mono">FULL_EVIDENCE_LOG</h3>
              <div className="h-px flex-grow bg-slate-200" />
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-200">
                  <tr>
                    <th className="p-4">Ref</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Alert Count</th>
                    <th className="p-4">Forensic Evidence</th>
                    <th className="p-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evidenceData.map((item, idx) => (
                    <motion.tr 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-red-600">EV_{idx + 1}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4 font-mono">{item.count}</td>
                      <td className="p-4 text-slate-600 italic">"{item.evidence}"</td>
                      <td className="p-4 text-right font-mono text-xs text-slate-400">{item.timestamp}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between text-[10px] font-mono text-slate-400 italic">
              <p>END_OF_REPORT</p>
              <p>TOTAL_ALERTS_ACCUMULATED: {evidenceData.reduce((acc, curr) => acc + curr.count, 0)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold tracking-widest text-slate-500">MODEL INSIGHT</p>
          <p className="text-sm text-slate-700 mt-2">
            {topInsight?.summary || 'No generated insight summary available for this case yet.'}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Confidence: {topInsight ? `${Math.round(topInsight.confidence_score * 100)}%` : 'N/A'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold tracking-widest text-slate-500">SUSPICIOUS WINDOWS</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {(timeline?.suspicious_windows ?? []).slice(0, 4).map((item, idx) => (
              <li key={`${item.start}-${idx}`} className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500" />
                <span>
                  {new Date(item.start).toLocaleString()} to {new Date(item.end).toLocaleString()} • {item.reason}
                </span>
              </li>
            ))}
            {!(timeline?.suspicious_windows ?? []).length ? <li className="text-slate-500">No suspicious windows detected.</li> : null}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold tracking-widest text-slate-500">SIMILAR CASE MATCHING</p>
        <div className="mt-3 space-y-2">
          {similarCases.slice(0, 5).map((item) => (
            <div key={item.case_id} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">{item.case_id}</p>
              <p className="text-xs text-slate-600 mt-1">
                Similarity: {(item.similarity_score * 100).toFixed(1)}%{item.crime_type ? ` • ${item.crime_type}` : ''}
              </p>
              <p className="text-xs text-slate-600 mt-1">{item.explanation}</p>
            </div>
          ))}
          {!similarCases.length ? <p className="text-sm text-slate-500">No similar cases matched yet.</p> : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold tracking-widest text-slate-500">FLAGGED CLUSTERS</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          {topClusters.map((cluster) => (
            <div key={cluster.id} className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">{cluster.anomaly_type}</p>
              <p className="text-xs text-slate-500 mt-1">Risk: {Math.round(cluster.risk_score * 100)}%</p>
            </div>
          ))}
          {!topClusters.length ? <p className="text-sm text-slate-500 md:col-span-3">No anomaly clusters generated yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
