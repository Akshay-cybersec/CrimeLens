'use client';

import React from 'react';
import { FileText, Cpu } from 'lucide-react';
import type { EvidenceResponse, InsightResponse, TimelineResponse } from '@/types/api';

type Props = {
  caseId: string;
  timeline: TimelineResponse | null;
  evidence: EvidenceResponse | null;
  insights: InsightResponse[];
};

export default function IntelligenceDashboardView({ caseId, timeline, evidence, insights }: Props) {
  const totalArtifacts = timeline?.pagination.total ?? 0;
  const flaggedMessages = evidence?.clusters.length ?? 0;
  const mediaFiles = timeline?.timeline.filter((event) => /photo|video|media|image/i.test(event.raw_text)).length ?? 0;
  const locationPins = timeline?.timeline.filter((event) => /location|gps|geo|tower/i.test(event.raw_text)).length ?? 0;
  const topInsight = insights[0];
  const secondInsight = insights[1];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Intelligence Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">AI-driven insights and parsed artifact overview.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium transition-colors flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Generate Quick Report
        </button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Artifacts', value: totalArtifacts.toLocaleString(), color: 'border-blue-500' },
          { label: 'Flagged Messages', value: flaggedMessages.toLocaleString(), color: 'border-red-500' },
          { label: 'Media Files', value: mediaFiles.toLocaleString(), color: 'border-purple-500' },
          { label: 'Location Pins', value: locationPins.toLocaleString(), color: 'border-emerald-500' }
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-t-4 ${stat.color}`}>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* AI Threat Analysis Panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800">AI Threat Analysis</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex justify-between items-start">
                <span className="text-sm font-semibold text-red-800">{topInsight?.contradiction_type || 'High Risk Keyword Match'}</span>
                <span className="text-xs font-mono text-red-600 bg-red-100 px-2 py-1 rounded">Score: {Math.round((topInsight?.confidence_score ?? 0.98) * 100)}%</span>
              </div>
              <p className="text-sm text-red-700 mt-2">{topInsight?.summary || 'Suspicious communication patterns detected across WhatsApp and Telegram regarding external file transfers.'}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
              <div className="flex justify-between items-start">
                <span className="text-sm font-semibold text-amber-800">{secondInsight?.contradiction_type || 'Anomalous Location Data'}</span>
                <span className="text-xs font-mono text-amber-600 bg-amber-100 px-2 py-1 rounded">Score: {Math.round((secondInsight?.confidence_score ?? 0.82) * 100)}%</span>
              </div>
              <p className="text-sm text-amber-700 mt-2">{secondInsight?.ai_reasoning || 'Device GPS coordinates contradict cellular tower logs between 02:00 and 04:00 AM.'}</p>
            </div>
          </div>
        </div>

        {/* UFDR Summary Panel */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
           <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-4">UFDR Summary</h3>
           <ul className="space-y-3 text-sm">
             <li className="flex justify-between">
               <span className="text-slate-500">Case ID</span>
               <span className="font-medium text-slate-800">{caseId || 'N/A'}</span>
             </li>
             <li className="flex justify-between">
               <span className="text-slate-500">Timeline Events</span>
               <span className="font-medium text-slate-800">{timeline?.timeline.length ?? 0}</span>
             </li>
             <li className="flex justify-between">
               <span className="text-slate-500">Evidence Clusters</span>
               <span className="font-medium text-slate-800">{evidence?.clusters.length ?? 0}</span>
             </li>
             <li className="flex justify-between">
               <span className="text-slate-500">Insights</span>
               <span className="font-medium text-slate-800">{insights.length}</span>
             </li>
           </ul>
        </div>
        
      </div>
    </div>
  );
}
