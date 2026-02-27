'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function ReviewEvidenceView() {
  return (
    <div className="h-full flex gap-6 animate-in fade-in duration-500">
      
      {/* Left Sidebar: Flagged Items List */}
      <div className="w-1/3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl font-semibold text-slate-700">
          Flagged Items (12)
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {[1, 2, 3, 4, 5].map((item, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-lg cursor-pointer ${
                i === 0 ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-red-600">High Priority</span>
                <span className="text-xs text-slate-400">14:32 PM</span>
              </div>
              <p className="text-sm font-medium text-slate-800 truncate">Suspicious File Transfer</p>
              <p className="text-xs text-slate-500 truncate mt-1">Found in: Telegram Cache</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Main Panel: Evidence Details */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-8 flex flex-col">
        <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Suspicious File Transfer</h2>
            <p className="text-sm text-slate-500 mt-1">Source: Telegram / Cache / File ID: 948123</p>
          </div>
          <button className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors">
            <CheckCircle2 className="w-4 h-4" /> Add to Report
          </button>
        </div>
        <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-6">
          <p className="font-mono text-sm text-slate-700 whitespace-pre-wrap">
            {"{\n  \"event_type\": \"file_send\",\n  \"recipient\": \"+1-555-0198\",\n  \"file_name\": \"offshore_accounts_2025.pdf\",\n  \"file_size\": \"2.4MB\",\n  \"encryption\": \"true\"\n}"}
          </p>
        </div>
      </div>

    </div>
  );
}