'use client';

import React from 'react';
import { Download, FileText } from 'lucide-react';
import type { CaseOverview, EvidenceResponse, InsightResponse, SimilarCaseResponse, TimelineResponse } from '@/types/api';

type Props = {
  caseId: string;
  timeline?: TimelineResponse | null;
  evidence?: EvidenceResponse | null;
  insights?: InsightResponse[];
  overview?: CaseOverview | null;
  similarCases?: SimilarCaseResponse[];
};

const parseRawFields = (rawText: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  rawText
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((part) => {
      const idx = part.indexOf(':');
      if (idx > 0) {
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (key && value) fields[key] = value;
      }
    });
  return fields;
};

const splitSentences = (text: string, max = 6) =>
  text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);

const pickEntity = (fields: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = fields[key];
    if (value && value.trim()) return value.trim();
  }
  return null;
};

const buildHypotheticalStory = (timeline?: TimelineResponse | null) => {
  const events = timeline?.timeline ?? [];
  if (!events.length) {
    return {
      story: 'Insufficient timeline artifacts for actor-chain hypothesis generation.',
      points: ['Load UFDR timeline data to generate a narrative chain.'],
    };
  }

  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const rows = sorted.map((event) => ({
    event,
    fields: parseRawFields(event.raw_text || ''),
    raw: (event.raw_text || '').toLowerCase(),
  }));

  const profile: { victim?: string; secondaryVictim?: string; suspect?: string } = {};
  const interactions: Array<{ from: string; to: string; when: string }> = [];

  rows.forEach((row) => {
    const role = (row.fields.role || '').toLowerCase();
    const name = pickEntity(row.fields, ['name', 'contact_name', 'person', 'owner_name']);
    if (name) {
      if (role === 'victim' && !profile.victim) profile.victim = name;
      if (role === 'secondary_victim' && !profile.secondaryVictim) profile.secondaryVictim = name;
      if (role === 'suspect' && !profile.suspect) profile.suspect = name;
    }

    const from = pickEntity(row.fields, ['from', 'sender', 'owner', 'caller', 'source']);
    const to = pickEntity(row.fields, ['to', 'receiver', 'target', 'callee', 'contact']);
    if (from && to && from !== to) {
      interactions.push({ from, to, when: new Date(row.event.timestamp).toLocaleString() });
    }
  });

  const hasAny = (...tokens: string[]) => rows.some((row) => tokens.some((token) => row.raw.includes(token)));
  const victim = profile.victim || 'the primary victim';
  const secondary = profile.secondaryVictim || 'the secondary victim';
  const suspect = profile.suspect || 'the primary suspect';

  const points: string[] = [];
  if (hasAny('google drive', 'cloud_download', 'drive export')) {
    points.push(`${suspect} appears linked to private cloud-data access associated with ${secondary}.`);
  }
  if (hasAny('anonymous gmail', 'account_creation', 'tor_browser_install', 'tor browser')) {
    points.push(`Identity-masking behavior appears present (anonymous account/TOR usage signals).`);
  }
  if (hasAny('telegram', 'threat', 'blackmail', 'extortion')) {
    points.push(`${victim} appears to have received coercive or threatening communication signals.`);
  }
  if (hasAny('sim_swap', 'sim swap', 'reset', 'password recovery')) {
    points.push(`Control-escalation indicators (SIM/account control) are present in timeline artifacts.`);
  }
  if (hasAny('goodbye_message', 'i’m sorry', "i'm sorry", 'self-harm', 'self harm', 'deceased')) {
    points.push(`Crisis-stage signals were detected before case-closing events.`);
  }
  if (hasAny('bulk_chat_deletion', 'chat deletion', 'deleted', 'wiped', 'removed')) {
    points.push(`Post-incident deletion behavior suggests potential evidence cleanup attempts.`);
  }
  if (!points.length && interactions.length >= 2) {
    const first = interactions[0];
    const second = interactions[1];
    points.push(`${first.from} communicated with ${first.to}, followed by ${second.from} -> ${second.to}.`);
    points.push(`This chain may indicate intermediary transfer of sensitive information.`);
  }
  if (!points.length) {
    points.push('Available data indicates suspicious behavioral variance but no strong direct actor-chain yet.');
  }

  return {
    story: points.join(' '),
    points,
  };
};

const buildCaseDecision = (
  caseId: string,
  timeline?: TimelineResponse | null,
  evidence?: EvidenceResponse | null,
  insights: InsightResponse[] = [],
  similarCases: SimilarCaseResponse[] = []
) => {
  const topInsight = insights[0];
  const topCluster = evidence?.clusters?.[0];
  const topMatch = similarCases[0];
  const suspiciousCount = timeline?.suspicious_windows?.length ?? 0;
  const insightScore = topInsight?.confidence_score ?? 0;
  const clusterScore = topCluster?.risk_score ?? 0;
  const weighted = Math.min(1, insightScore * 0.45 + clusterScore * 0.4 + Math.min(0.15, suspiciousCount * 0.03));
  const verdict = weighted >= 0.72 ? 'Escalate for immediate review' : weighted >= 0.5 ? 'Needs investigator validation' : 'Monitor and gather more evidence';
  const story = [
    `Case ${caseId || 'N/A'} indicates a weighted risk posture from timeline irregularities, anomaly clusters, and AI confidence signals.`,
    suspiciousCount
      ? `${suspiciousCount} suspicious timeline window(s) suggest possible coordination or concealment patterns.`
      : 'No major suspicious windows are present, but interaction visibility may still be incomplete.',
    topCluster
      ? `Top anomaly cluster risk is ${Math.round(topCluster.risk_score * 100)}% with reasoning: ${topCluster.reasoning}.`
      : 'No high-confidence anomaly cluster was produced.',
    topInsight
      ? `Primary AI insight confidence is ${Math.round(topInsight.confidence_score * 100)}% and highlights behavioral inconsistency markers.`
      : 'AI insight summary is currently unavailable.',
    topMatch
      ? `Closest historical match is case ${topMatch.case_id} at ${(topMatch.similarity_score * 100).toFixed(1)}% similarity.`
      : 'No strong similar-case correlation was detected.',
    `Recommended status: ${verdict}.`,
  ].join(' ');

  const nextStep =
    verdict === 'Escalate for immediate review'
      ? 'Escalate immediately, preserve all linked artifacts, and perform investigator verification against witness/device context.'
      : verdict === 'Needs investigator validation'
        ? 'Validate top clusters and suspicious windows with manual correlation before legal/operational decisions.'
        : 'Continue ingesting additional UFDR artifacts and monitor interaction chains for stronger confidence.';

  return { score: Math.round(weighted * 100), verdict, story, nextStep };
};

export default function ExportReportView({
  caseId,
  timeline,
  evidence,
  insights = [],
  overview,
  similarCases = [],
}: Props) {
  const totalEvents = timeline?.pagination.total ?? timeline?.timeline.length ?? 0;
  const flaggedItems = evidence?.clusters.length ?? 0;
  const hasTimeline = totalEvents > 0;
  const decision = buildCaseDecision(caseId, timeline, evidence, insights, similarCases);
  const hypothetical = buildHypotheticalStory(timeline);

  const buildReportPayload = () => ({
    case_id: caseId || null,
    generated_at: new Date().toISOString(),
    summary: {
      case_title: overview?.title ?? null,
      source_filename: overview?.source_filename ?? null,
      total_events: totalEvents,
      flagged_clusters: flaggedItems,
      suspicious_windows: timeline?.suspicious_windows.length ?? 0,
      insights_count: insights.length,
      activity_density_score: timeline?.activity_density_score ?? null,
    },
    timeline_range: timeline?.time_range ?? null,
    suspicious_windows: timeline?.suspicious_windows ?? [],
    insights,
    flagged_clusters: evidence?.clusters ?? [],
    similar_cases: similarCases,
    ai_hypothetical_story: hypothetical,
    ai_case_decision: decision,
  });

  const downloadFile = (filename: string, content: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportJson = () => {
    const payload = buildReportPayload();
    downloadFile(`case-report-${caseId || 'unknown'}.json`, JSON.stringify(payload, null, 2), 'application/json');
  };

  const handleExportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const payload = buildReportPayload();
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (needed = 24) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const heading = (text: string) => {
      ensureSpace(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(text, margin, y);
      y += 18;
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    };

    const subheading = (text: string) => {
      ensureSpace(18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(text, margin, y);
      y += 14;
    };

    const paragraph = (text: string, fontSize = 10, indent = 0) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, contentWidth - indent);
      lines.forEach((line: string) => {
        ensureSpace(14);
        doc.text(line, margin + indent, y);
        y += 13;
      });
      y += 2;
    };

    const kv = (k: string, v: string) => paragraph(`${k}: ${v}`);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CrimeLens Full Forensic Report', margin, y);
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Case ID: ${payload.case_id ?? 'N/A'} | Generated: ${new Date(payload.generated_at).toLocaleString()}`, margin, y);
    y += 20;

    heading('1. Executive Summary');
    kv('Case Title', payload.summary.case_title ?? 'N/A');
    kv('Source File', payload.summary.source_filename ?? 'N/A');
    kv('Total Events', String(payload.summary.total_events));
    kv('Flagged Clusters', String(payload.summary.flagged_clusters));
    kv('Suspicious Windows', String(payload.summary.suspicious_windows));
    kv('Insights Count', String(payload.summary.insights_count));
    kv('Activity Density Score', String(payload.summary.activity_density_score ?? 'N/A'));

    heading('2. Timeline and Suspicious Windows');
    kv(
      'Timeline Range',
      `${payload.timeline_range?.start ? new Date(payload.timeline_range.start).toLocaleString() : 'N/A'} to ${payload.timeline_range?.end ? new Date(payload.timeline_range.end).toLocaleString() : 'N/A'}`
    );
    if (payload.suspicious_windows.length) {
      payload.suspicious_windows.forEach((row, idx) => {
        ensureSpace(56);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Window ${idx + 1}`, margin, y);
        y += 13;
        doc.setFont('helvetica', 'normal');
        paragraph(`Start: ${new Date(row.start).toLocaleString()}`, 10, 12);
        paragraph(`End: ${new Date(row.end).toLocaleString()}`, 10, 12);
        paragraph(`Severity: ${row.severity}`, 10, 12);
        paragraph(`Reason: ${row.reason}`, 10, 12);
      });
    } else {
      paragraph('No suspicious windows detected.');
    }

    heading('3. AI Insights and Reasoning');
    if (payload.insights.length) {
      payload.insights.forEach((insight, idx) => {
        ensureSpace(72);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`AI Insight ${idx + 1}`, margin, y);
        y += 14;
        paragraph(`Confidence Score: ${(insight.confidence_score * 100).toFixed(1)}%`, 10, 12);
        paragraph(`Model: ${insight.generated_by_model || 'N/A'}`, 10, 12);
        paragraph(`Summary: ${insight.summary || 'N/A'}`, 10, 12);
        paragraph('AI Reasoning:', 10, 12);
        splitSentences(insight.ai_reasoning || '', 10).forEach((line) => paragraph(`- ${line}`, 10, 24));
      });
    } else {
      paragraph('No AI insights available.');
    }

    heading('4. Flagged Evidence Analysis');
    if (payload.flagged_clusters.length) {
      payload.flagged_clusters.forEach((cluster, idx) => {
        ensureSpace(72);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Cluster ${idx + 1}: ${cluster.anomaly_type}`, margin, y);
        y += 14;
        paragraph(`Risk Score: ${(cluster.risk_score * 100).toFixed(1)}%`, 10, 12);
        paragraph(`Reasoning: ${cluster.reasoning || 'N/A'}`, 10, 12);
        paragraph(`Linked Event Count: ${cluster.related_event_ids.length}`, 10, 12);
        cluster.related_events.slice(0, 8).forEach((event, eventIdx) => {
          ensureSpace(50);
          paragraph(`Event ${eventIdx + 1}: ${event.event_type} | ${new Date(event.timestamp).toLocaleString()}`, 10, 18);
          const parsed = parseRawFields(event.raw_text || '');
          const parsedEntries = Object.entries(parsed).slice(0, 6);
          if (parsedEntries.length) {
            parsedEntries.forEach(([k, v]) => paragraph(`- ${k}: ${String(v)}`, 10, 30));
          } else {
            paragraph(`- ${event.raw_text || ''}`, 10, 30);
          }
        });
      });
    } else {
      paragraph('No flagged clusters available.');
    }

    heading('5. Similar Case Correlation');
    if (payload.similar_cases.length) {
      payload.similar_cases.slice(0, 6).forEach((item, idx) => {
        paragraph(
          `${idx + 1}. ${item.case_id} | Similarity ${(item.similarity_score * 100).toFixed(1)}% | ${item.explanation || 'N/A'}`
        );
      });
    } else {
      paragraph('No similar case matches available.');
    }

    heading('6. AI Hypothetical Story');
    paragraph(payload.ai_hypothetical_story.story);
    subheading('Hypothesis Points');
    payload.ai_hypothetical_story.points.forEach((point: string) => paragraph(`- ${point}`, 10, 12));

    heading('7. AI Case Decision and Next Step');
    kv('Decision Score', `${payload.ai_case_decision.score}%`);
    kv('Verdict', payload.ai_case_decision.verdict);
    subheading('Decision Story');
    splitSentences(payload.ai_case_decision.story, 12).forEach((line) => paragraph(`- ${line}`, 10, 12));
    subheading('Next Step Note');
    paragraph(payload.ai_case_decision.nextStep, 10, 12);

    doc.save(`case-report-${caseId || 'unknown'}.pdf`);
  };

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-xl shadow-sm p-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Generate Full Forensic Report</h2>
          <p className="text-slate-500 text-sm">Includes full timeline, AI reasoning with score, and final AI case decision story.</p>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
          <input type="checkbox" checked readOnly disabled={!hasTimeline} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">Executive Summary + Timeline Analysis</span>
        </label>
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
          <input type="checkbox" checked readOnly className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">Detailed AI Insights & Reasoning Scores</span>
        </label>
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
          <input type="checkbox" checked readOnly className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">Flagged Evidence Clusters with Linked Events</span>
        </label>
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
          <input type="checkbox" checked readOnly className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">AI Case Decision Story + Next Step Note</span>
        </label>
      </div>

      <div className="flex gap-4">
        <button onClick={handleExportPdf} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
          <Download className="w-4 h-4" /> Export Full PDF Report
        </button>
        <button onClick={handleExportJson} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg text-sm font-semibold transition-colors">
          Export Full JSON
        </button>
      </div>
    </div>
  );
}
