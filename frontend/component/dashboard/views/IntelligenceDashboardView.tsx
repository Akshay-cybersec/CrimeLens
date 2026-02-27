'use client';

import React from 'react';
import { FileText, Cpu } from 'lucide-react';

export default function IntelligenceDashboardView() {
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
          { label: 'Total Artifacts', value: '142,893', color: 'border-blue-500' },
          { label: 'Flagged Messages', value: '412', color: 'border-red-500' },
          { label: 'Media Files', value: '8,431', color: 'border-purple-500' },
          { label: 'Location Pins', value: '1,024', color: 'border-emerald-500' }
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

        {/* UFDR Summary Panel */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
           <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-4">UFDR Summary</h3>
           <ul className="space-y-3 text-sm">
             <li className="flex justify-between">
               <span className="text-slate-500">Device Model</span>
               <span className="font-medium text-slate-800">iPhone 14 Pro</span>
             </li>
             <li className="flex justify-between">
               <span className="text-slate-500">OS Version</span>
               <span className="font-medium text-slate-800">iOS 17.2.1</span>
             </li>
             <li className="flex justify-between">
               <span className="text-slate-500">Extraction Type</span>
               <span className="font-medium text-slate-800">Full File System</span>
             </li>
             <li className="flex justify-between">
               <span className="text-slate-500">Time to Parse</span>
               <span className="font-medium text-slate-800">42m 18s</span>
             </li>
           </ul>
        </div>
        
      </div>
    </div>
  );
}