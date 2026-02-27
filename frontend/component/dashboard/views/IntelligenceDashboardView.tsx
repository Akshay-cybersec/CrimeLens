'use client';

import React from 'react';
import {
  FileText,
  Cpu,
  Briefcase,
  CheckCircle2,
  Clock,
  Activity,
  AlertTriangle,
  Image as ImageIcon,
  MapPin,
  Database,
} from 'lucide-react';
import type { CaseListItem, CaseOverview, DashboardMetrics, EvidenceResponse, InsightResponse, TimelineResponse } from '@/types/api';

type Props = {
  caseId?: string;
  timeline?: TimelineResponse | null;
  evidence?: EvidenceResponse | null;
  insights?: InsightResponse[];
  cases?: CaseListItem[];
  overview?: CaseOverview | null;
  demoMetrics?: DashboardMetrics | null;
};

export default function IntelligenceDashboardView({
  caseId,
  timeline,
  evidence,
  insights,
  cases = [],
  overview,
  demoMetrics,
}: Props) {
  const totalArtifactsLive = overview?.total_events ?? timeline?.pagination.total ?? 0;
  const flaggedMessagesLive = (overview?.event_types?.MESSAGE ?? 0) + (overview?.event_types?.DELETION ?? 0);
  const mediaFilesLive = timeline?.timeline.filter((item) => {
    const raw = item.raw_text.toLowerCase();
    return raw.includes('photo') || raw.includes('video') || raw.includes('media');
  }).length ?? 0;
  const locationPinsLive = overview?.event_types?.LOCATION ?? timeline?.timeline.filter((item) => item.event_type === 'LOCATION').length ?? 0;
  const totalCasesLive = cases.length;
  const activeCasesLive = cases.filter((item) => {
    const updated = new Date(item.updated_at).getTime();
    return Date.now() - updated <= 30 * 24 * 60 * 60 * 1000;
  }).length;

  const totalArtifacts = totalArtifactsLive || demoMetrics?.total_artifacts || 0;
  const flaggedMessages = flaggedMessagesLive || demoMetrics?.flagged_messages || 0;
  const mediaFiles = mediaFilesLive || demoMetrics?.media_files || 0;
  const locationPins = locationPinsLive || demoMetrics?.location_pins || 0;
  const totalCases = totalCasesLive || demoMetrics?.total_cases || 0;
  const activeCases = activeCasesLive || demoMetrics?.active_cases || 0;
  const casesWithInsights = (insights ?? []).length || demoMetrics?.cases_with_insights || 0;
  const flaggedClusters = evidence?.clusters.length || demoMetrics?.flagged_clusters || 0;
  const recentCases = [...cases].slice(0, 3);
  const topInsight = insights?.[0];
  const topCluster = evidence?.clusters[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 bg-slate-50 min-h-screen p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Command Center</h2>
          <p className="text-slate-500 text-sm mt-1">Investigative case overview and AI-parsed artifact analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md shadow-sm text-sm font-medium transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: String(totalCases), icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Cases With Insights', value: String(casesWithInsights), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Active Cases', value: String(activeCases), icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { label: 'Flagged Clusters', value: String(flaggedClusters), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 mt-4">Active Extraction: {caseId || 'No case selected'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Artifacts', value: String(totalArtifacts), icon: Database, color: 'border-blue-500' },
            { label: 'Flagged Messages', value: String(flaggedMessages), icon: AlertTriangle, color: 'border-red-500' },
            { label: 'Media Files', value: String(mediaFiles), icon: ImageIcon, color: 'border-purple-500' },
            { label: 'Location Pins', value: String(locationPins), icon: MapPin, color: 'border-emerald-500' },
          ].map((stat, i) => (
            <div key={i} className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 ${stat.color} flex justify-between items-center`}>
              <div>
                <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <stat.icon className="w-8 h-8 text-slate-200" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">AI Threat Analysis (Current Case)</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-red-800">{topInsight ? 'Primary Insight Signal' : 'Insight Pending'}</span>
                  <span className="text-xs font-mono text-red-600 bg-red-100 px-2 py-1 rounded">
                    Score: {Math.round((topInsight?.confidence_score ?? 0) * 100)}%
                  </span>
                </div>
                <p className="text-sm text-red-700 mt-2">{topInsight?.summary || 'No generated insight summary available for this case yet.'}</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-amber-800">Evidence Cluster Summary</span>
                  <span className="text-xs font-mono text-amber-600 bg-amber-100 px-2 py-1 rounded">
                    Score: {Math.round((topCluster?.risk_score ?? 0) * 100)}%
                  </span>
                </div>
                <p className="text-sm text-amber-700 mt-2">{topCluster?.reasoning || 'No evidence cluster generated for this case yet.'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-4">Recent Cases Queue</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Case ID</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 rounded-tr-lg">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentCases.map((row) => (
                    <tr key={row.case_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.case_id}</td>
                      <td className="px-4 py-3 text-slate-600">{row.title}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">Active</span></td>
                      <td className="px-4 py-3 text-slate-500">{new Date(row.updated_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!recentCases.length ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={4}>No cases available yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 h-fit">
          <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-4">Case Summary</h3>
          <ul className="space-y-4 text-sm">
            <li className="flex justify-between items-center">
              <span className="text-slate-500">Source File</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">{overview?.source_filename || 'N/A'}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-500">Case Owner</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">{overview?.owner_id || 'N/A'}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-500">Event Types</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">{Object.keys(overview?.event_types || {}).length}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-500">Created At</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">
                {overview?.created_at ? new Date(overview.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-500">Last Updated</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">
                {overview?.updated_at ? new Date(overview.updated_at).toLocaleString() : 'N/A'}
              </span>
            </li>
          </ul>

          <button className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-sm font-medium transition-colors">
            View Full Extraction Log
          </button>
        </div>
      </div>
    </div>
  );
}
