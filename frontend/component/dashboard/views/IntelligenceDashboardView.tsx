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
  Plus
} from 'lucide-react';
import type { EvidenceResponse, InsightResponse, TimelineResponse } from '@/types/api';

type Props = {
  caseId?: string;
  timeline?: TimelineResponse | null;
  evidence?: EvidenceResponse | null;
  insights?: InsightResponse[];
};

export default function IntelligenceDashboardView(_props: Props) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 bg-slate-50 min-h-screen p-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Intelligence Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Investigative case overview and AI-parsed artifact analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md shadow-sm text-sm font-medium transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Generate Report
          </button>
          
        </div>
      </div>

      {/* --- NEW SECTION: Case Management Overview --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: '147', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Cases Solved', value: '124', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Ongoing Cases', value: '18', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { label: 'Pending Review', value: '5', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' }
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

      {/* --- ACTIVE EXTRACTION: Artifact Stats --- */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 mt-4">Active Extraction: Case #2026-89A</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Artifacts', value: '142,893', icon: Database, color: 'border-blue-500' },
            { label: 'Flagged Messages', value: '412', icon: AlertTriangle, color: 'border-red-500' },
            { label: 'Media Files', value: '8,431', icon: ImageIcon, color: 'border-purple-500' },
            { label: 'Location Pins', value: '1,024', icon: MapPin, color: 'border-emerald-500' }
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

      {/* --- Main Content Area --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Threat Analysis & UFDR Summary */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Threat Analysis Panel */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">AI Threat Analysis (Current Case)</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-red-800">High Risk Keyword Match</span>
                  <span className="text-xs font-mono text-red-600 bg-red-100 px-2 py-1 rounded">Score: 98%</span>
                </div>
                <p className="text-sm text-red-700 mt-2">Suspicious communication patterns detected across WhatsApp and Telegram regarding external file transfers.</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-amber-800">Anomalous Location Data</span>
                  <span className="text-xs font-mono text-amber-600 bg-amber-100 px-2 py-1 rounded">Score: 82%</span>
                </div>
                <p className="text-sm text-amber-700 mt-2">Device GPS coordinates contradict cellular tower logs between 02:00 and 04:00 AM.</p>
              </div>
            </div>
          </div>

          {/* Recent Cases Panel (NEW) */}
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
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">#2026-89A</td>
                    <td className="px-4 py-3 text-slate-600">Corporate Espionage</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">Ongoing</span></td>
                    <td className="px-4 py-3 text-slate-500">2 hours ago</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">#2026-88B</td>
                    <td className="px-4 py-3 text-slate-600">Unauthorized Access</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Pending</span></td>
                    <td className="px-4 py-3 text-slate-500">Yesterday</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">#2026-87X</td>
                    <td className="px-4 py-3 text-slate-600">Financial Fraud</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Solved</span></td>
                    <td className="px-4 py-3 text-slate-500">Oct 12, 2023</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: UFDR Summary Panel */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 h-fit">
          <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-4">UFDR Summary</h3>
          <div className="flex justify-center mb-6">
            {/* Visual placeholder for a device icon/graphic */}
            <div className="w-24 h-32 border-4 border-slate-800 rounded-3xl relative">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-800 rounded-full"></div>
            </div>
          </div>
          <ul className="space-y-4 text-sm">
            <li className="flex justify-between items-center">
              <span className="text-slate-500">Device Model</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">iPhone 14 Pro</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-500">OS Version</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">iOS 17.2.1</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-500">Extraction Type</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">Full File System</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-500">Time to Parse</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">42m 18s</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-500">Data Size</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">128.4 GB</span>
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
