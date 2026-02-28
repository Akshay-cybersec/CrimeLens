'use client';

import React from 'react';
import type { CaseOverview, EvidenceResponse, InsightResponse, SimilarCaseResponse, TimelineResponse } from '@/types/api';

type Props = {
  caseId: string;
  overview: CaseOverview | null;
  timeline: TimelineResponse | null;
  insights: InsightResponse[];
  evidence: EvidenceResponse | null;
  similarCases: SimilarCaseResponse[];
};

const parseRawFields = (rawText: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  rawText
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((part) => {
      const index = part.indexOf(':');
      if (index > 0) {
        const key = part.slice(0, index).trim().toLowerCase();
        const value = part.slice(index + 1).trim();
        if (key && value) fields[key] = value;
      }
    });
  return fields;
};

const normalizeEntity = (value: string): string => value.replace(/\s+/g, ' ').trim();

const pickEntity = (fields: Record<string, string>, preferred: string[]): string | null => {
  for (const key of preferred) {
    const value = fields[key];
    if (value && value.trim()) return normalizeEntity(value);
  }
  return null;
};

export default function CaseDecisionBetaView({ caseId, overview, timeline, insights, evidence, similarCases }: Props) {
  const topInsight = insights[0];
  const topCluster = evidence?.clusters?.[0];
  const topMatch = similarCases[0];

  const totalEvents = overview?.total_events ?? timeline?.pagination.total ?? timeline?.timeline.length ?? 0;
  const suspiciousCount = timeline?.suspicious_windows?.length ?? 0;
  const clusterCount = evidence?.clusters?.length ?? 0;
  const insightConfidence = Math.round((topInsight?.confidence_score ?? 0) * 100);
  const topRisk = Math.round((topCluster?.risk_score ?? 0) * 100);

  const insightScore = topInsight?.confidence_score ?? 0;
  const clusterScore = topCluster?.risk_score ?? 0;
  const weighted = Math.min(1, insightScore * 0.45 + clusterScore * 0.4 + Math.min(0.15, suspiciousCount * 0.03));
  const decision = {
    score: Math.round(weighted * 100),
    verdict: weighted >= 0.72 ? 'Escalate for immediate review' : weighted >= 0.5 ? 'Needs investigator validation' : 'Monitor and gather more evidence',
  };

  const hypothesisStory = (() => {
    const events = timeline?.timeline ?? [];
    if (!events.length) {
      return 'UFDR timeline data is still limited, so this is an early-stage hypothesis: the case currently shows low interaction visibility and requires additional extraction sources (messages/calls/social app logs) to build a stronger actor-to-actor story.';
    }

    const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const interactions: Array<{ from: string; to: string; when: string }> = [];

    for (const event of sorted) {
      const fields = parseRawFields(event.raw_text || '');
      const from = pickEntity(fields, ['from', 'sender', 'source', 'owner', 'caller', 'contact_from']);
      const to = pickEntity(fields, ['to', 'receiver', 'target', 'callee', 'contact_to', 'contact']);
      if (from && to && from !== to) {
        interactions.push({
          from,
          to,
          when: new Date(event.timestamp).toLocaleString(),
        });
      }
    }

    if (interactions.length < 2) {
      const earliest = sorted[0];
      const latest = sorted[sorted.length - 1];
      const clusterRisk = topCluster ? `${Math.round(topCluster.risk_score * 100)}%` : 'N/A';
      const insightRisk = topInsight ? `${Math.round(topInsight.confidence_score * 100)}%` : 'N/A';
      return `A complete X→Y→Z chain is not fully visible yet, but the extracted activity from ${new Date(earliest.timestamp).toLocaleString()} to ${new Date(latest.timestamp).toLocaleString()} still indicates behavioral irregularities. `
        + `Current indicators (cluster risk ${clusterRisk}, insight confidence ${insightRisk}) suggest possible coordinated or concealed communication patterns. `
        + `Working hypothesis: a small interaction set may be part of a larger hidden exchange, so this case should stay in active review while more communication artifacts are ingested.`;
    }

    const uniquePeople: string[] = [];
    const pushUnique = (name: string) => {
      if (!uniquePeople.some((item) => item.toLowerCase() === name.toLowerCase())) uniquePeople.push(name);
    };
    interactions.forEach((item) => {
      pushUnique(item.from);
      pushUnique(item.to);
    });

    const aliases = new Map<string, string>();
    uniquePeople.forEach((name, index) => aliases.set(name.toLowerCase(), `User ${String.fromCharCode(88 + (index % 3))}${index >= 3 ? index - 2 : ''}`));
    const aliasOf = (name: string) => aliases.get(name.toLowerCase()) || name;

    const first = interactions[0];
    const second = interactions.find((item) => item.from.toLowerCase() === first.to.toLowerCase() && item.to.toLowerCase() !== first.from.toLowerCase()) || interactions[1];
    const clusterRisk = topCluster ? `${Math.round(topCluster.risk_score * 100)}%` : 'N/A';
    const insightRisk = topInsight ? `${Math.round(topInsight.confidence_score * 100)}%` : 'N/A';

    return `${aliasOf(first.from)} appears to have communicated with ${aliasOf(first.to)} around ${first.when}. `
      + `After that, ${aliasOf(second.from)} interacted with ${aliasOf(second.to)} around ${second.when}. `
      + `This sequence may indicate possible transfer of sensitive context from ${aliasOf(first.from)} through ${aliasOf(first.to)} toward ${aliasOf(second.to)}. `
      + `One plausible hypothesis is that gathered personal details were later used for pressure or blackmail attempts. `
      + `Current system signals (cluster risk ${clusterRisk}, insight confidence ${insightRisk}) support escalation for human verification before final conclusion.`;
  })();

  const storyPoints = [
    `Case ${caseId || 'N/A'} was reconstructed from ${totalEvents} UFDR-derived events.`,
    suspiciousCount
      ? `${suspiciousCount} suspicious timeline windows were detected, indicating behavior breaks around critical periods.`
      : 'No major suspicious timeline windows were detected, so chronology remains relatively stable.',
    clusterCount
      ? `${clusterCount} anomaly clusters were flagged, with the top cluster at ${topRisk}% risk.`
      : 'No high-confidence anomaly clusters were flagged yet.',
    topInsight
      ? `The AI insight reports ${insightConfidence}% confidence and indicates behavioral inconsistency patterns that need investigator validation.`
      : 'No AI insight summary is available yet for this case.',
    topMatch
      ? `A similar historical case (${topMatch.case_id}) matched at ${(topMatch.similarity_score * 100).toFixed(1)}%, suggesting a comparable digital behavior profile.`
      : 'No strong similar-case match was found.',
    `Current decision: ${decision.verdict} (decision strength ${decision.score}%).`,
  ];

  const hypothesisPoints = hypothesisStory
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-bold tracking-widest text-amber-700 uppercase">Beta Route</p>
        <p className="text-sm text-amber-900 mt-1 leading-relaxed">
          This conclusion is an investigative draft generated from UFDR-derived signals. It is not a legal finding.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Case Decision (Beta)</p>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mt-2">Case {caseId || 'N/A'} Story & Conclusion</h2>
        <ul className="mt-3 space-y-2.5">
          {storyPoints.map((point, idx) => (
            <li key={`${point}-${idx}`} className="text-sm text-slate-700 leading-7">
              <span className="font-semibold text-slate-900">Point {idx + 1}:</span> {point}
            </li>
          ))}
        </ul>
        <div className="mt-4 inline-flex items-center rounded border border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="text-xs text-slate-500 mr-2">Decision Strength</span>
          <span className="text-sm font-bold text-slate-900">{decision.score}%</span>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-bold tracking-widest text-blue-700 uppercase">AI Predicted Story (Hypothesis)</p>
        <ul className="mt-2 space-y-2">
          {hypothesisPoints.map((point, idx) => (
            <li key={`${point}-${idx}`} className="text-sm text-blue-900 leading-7">
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Recommended Next Step</p>
        <p className="text-sm text-slate-700 mt-2 leading-7">
          {decision.verdict === 'Escalate for immediate review'
            ? 'Escalate this case for priority human review, preserve all linked artifacts, and validate the top anomaly timeline against witness/device context.'
            : decision.verdict === 'Needs investigator validation'
              ? 'Proceed with investigator validation of top anomaly clusters and suspicious windows before finalizing legal or operational conclusions.'
              : 'Continue monitoring and ingest additional UFDR sources to raise confidence before escalation.'}
        </p>
      </div>
    </div>
  );
}

