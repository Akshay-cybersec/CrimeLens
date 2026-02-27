'use client';

import React, { useMemo, useState } from 'react';
import { Database, Search } from 'lucide-react';
import type { CaseListItem, CaseOverview } from '@/types/api';

type Props = {
  cases: CaseListItem[];
  selectedCaseId?: string;
  onSelectCase: (caseId: string) => void;
  caseOverview?: CaseOverview | null;
};

export default function CreateCaseView({ cases, selectedCaseId, onSelectCase, caseOverview }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return cases;
    }
    return cases.filter((item) => {
      return (
        item.case_id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    });
  }, [cases, query]);

  return (
    <div className="h-full flex gap-6 animate-in fade-in duration-500">
      <div className="w-1/3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-800">Past Cases</h2>
          <p className="text-xs text-slate-500 mt-1">Select a case to inspect investigation details.</p>
          <div className="mt-3 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by case id/title"
              className="w-full border border-slate-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.map((item) => (
            <button
              key={item.case_id}
              onClick={() => onSelectCase(item.case_id)}
              className={`w-full text-left p-4 hover:bg-slate-50 ${
                selectedCaseId === item.case_id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <p className="text-sm font-semibold text-slate-800">{item.case_id}</p>
              <p className="text-sm text-slate-600 truncate mt-1">{item.title}</p>
              <p className="text-xs text-slate-500 mt-1">{new Date(item.updated_at).toLocaleString()}</p>
            </button>
          ))}
          {!filtered.length ? (
            <div className="p-4 text-sm text-slate-500">No matching cases found.</div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-4 mb-4">
          <Database className="w-5 h-5 text-indigo-600" />
          <h3 className="text-xl font-bold text-slate-800">Case Detail</h3>
        </div>

        {!caseOverview ? (
          <p className="text-sm text-slate-500">Select a case to view details.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">Case ID</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{caseOverview.case_id}</p>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">Source File</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{caseOverview.source_filename}</p>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">Created At</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{new Date(caseOverview.created_at).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">Total Events</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{caseOverview.total_events}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">Title</p>
              <p className="text-sm text-slate-700 mt-1">{caseOverview.title}</p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">Description</p>
              <p className="text-sm text-slate-700 mt-1">{caseOverview.description || 'No description available.'}</p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-2">Event Type Distribution</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(caseOverview.event_types).map(([eventType, count]) => (
                  <span key={eventType} className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                    {eventType}: {count}
                  </span>
                ))}
                {!Object.keys(caseOverview.event_types).length ? (
                  <span className="text-sm text-slate-500">No event statistics available.</span>
                ) : null}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-2">Latest Events</p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {caseOverview.latest_events.map((event) => (
                  <div key={event.id} className="p-3 border border-slate-100 rounded bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold bg-slate-200 text-slate-700 rounded px-2 py-0.5">{event.event_type}</span>
                      <span className="text-xs text-slate-500 font-mono">{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{event.raw_text}</p>
                  </div>
                ))}
                {!caseOverview.latest_events.length ? (
                  <p className="text-sm text-slate-500">No latest events available.</p>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
