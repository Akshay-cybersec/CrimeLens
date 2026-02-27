'use client';

import React from 'react';
import { FileText, Download } from 'lucide-react';
import type { EvidenceResponse, InsightResponse, TimelineResponse } from '@/types/api';

type Props = {
  caseId: string;
  timeline?: TimelineResponse | null;
  evidence?: EvidenceResponse | null;
  insights?: InsightResponse[];
};

export default function ExportReportView({ caseId, timeline, evidence, insights = [] }: Props) {
  const totalEvents = timeline?.pagination.total ?? timeline?.timeline.length ?? 0;
  const flaggedItems = evidence?.clusters.length ?? 0;
  const hasTimeline = totalEvents > 0;

  const buildReportPayload = () => ({
    case_id: caseId || null,
    generated_at: new Date().toISOString(),
    summary: {
      total_events: totalEvents,
      flagged_clusters: flaggedItems,
      suspicious_windows: timeline?.suspicious_windows.length ?? 0,
      insights_count: insights.length,
    },
    insights,
    suspicious_windows: timeline?.suspicious_windows ?? [],
    flagged_clusters: evidence?.clusters ?? [],
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

  const handleExportPdf = () => {
    const payload = buildReportPayload();
    const lines = [
      'CrimeLens Investigative Report',
      `Case ID: ${payload.case_id ?? 'N/A'}`,
      `Generated At: ${payload.generated_at}`,
      '',
      `Total Events: ${payload.summary.total_events}`,
      `Flagged Clusters: ${payload.summary.flagged_clusters}`,
      `Suspicious Windows: ${payload.summary.suspicious_windows}`,
      `Insights Count: ${payload.summary.insights_count}`,
      '',
      'Note: This export is a text-based summary for quick sharing.',
    ];
    downloadFile(`case-report-${caseId || 'unknown'}.txt`, lines.join('\n'), 'text/plain;charset=utf-8');
  };

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-xl shadow-sm p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Generate Court Report</h2>
          <p className="text-slate-500 text-sm">Compile flagged evidence into an official document.</p>
        </div>
      </div>
      
      {/* Options */}
      <div className="space-y-4 mb-8">
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <input type="checkbox" defaultChecked disabled={!hasTimeline} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">Include Executive Summary & Timeline</span>
        </label>
        
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">Include Flagged Evidence Log ({flaggedItems} items)</span>
        </label>
        
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">Include Full Extracted Artifact Matrix ({totalEvents} artifacts)</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button onClick={handleExportPdf} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
          <Download className="w-4 h-4" /> Export as PDF
        </button>
        <button onClick={handleExportJson} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg text-sm font-semibold transition-colors">
          Export JSON Data
        </button>
      </div>

    </div>
  );
}
