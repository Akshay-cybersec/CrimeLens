'use client';

import React, { useEffect, useState } from 'react';
import { FileBox } from 'lucide-react';
import { caseService } from '@/services/caseService';
import { toastError } from '@/lib/toast';
import type { SearchResponse, TimelineEvent, TimelineResponse } from '@/types/api';

type Props = {
  caseId: string;
  timeline: TimelineResponse | null;
};

export default function ParsedDataView({ caseId, timeline }: Props) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<TimelineEvent[]>([]);
  const [searchMeta, setSearchMeta] = useState<Pick<SearchResponse, 'interpreted_query' | 'explanation'> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchApplied, setSearchApplied] = useState(false);

  useEffect(() => {
    setRows(timeline?.timeline ?? []);
    setSearchMeta(null);
    setSearchApplied(false);
  }, [timeline]);

  const runSearch = async () => {
    if (!caseId || !query.trim()) {
      setRows(timeline?.timeline ?? []);
      setSearchMeta(null);
      setSearchApplied(false);
      return;
    }
    try {
      setIsSearching(true);
      const result = await caseService.semanticSearch(caseId, query.trim(), 25);
      setRows(result.matching_events);
      setSearchMeta({
        interpreted_query: result.interpreted_query,
        explanation: result.explanation,
      });
      setSearchApplied(true);
    } catch {
      toastError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const applyExample = (value: string) => {
    setQuery(value);
  };

  const visibleRows = rows.length ? rows : timeline?.timeline ?? [];
  const explanationBullets = (searchMeta?.explanation || '')
    .split(/[\n.]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 6);

  const eventTypeClass = (eventType: string) => {
    if (eventType === 'CALL') return 'bg-blue-100 text-blue-700';
    if (eventType === 'MESSAGE') return 'bg-emerald-100 text-emerald-700';
    if (eventType === 'DELETION') return 'bg-red-100 text-red-700';
    if (eventType === 'LOCATION') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center gap-6">
        {/* Left Side: Title & Subtitle */}
        <div className="flex-none">
          <h2 className="text-lg font-bold text-slate-800">Artifact Explorer</h2>
          <p className="text-sm text-slate-500">Raw parsed data from extraction.</p>
        </div>

        {/* Center: Increased Size Input Box */}
        <div className="flex-1 flex justify-center">
          <input 
            type="text" 
            placeholder="Try: give me whatsapp related messages"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void runSearch();
              }
            }}
            className="w-full max-w-2xl border border-slate-300 rounded-md px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
          />
        </div>

        {/* Right Side: Fixed Filter Button */}
        <div className="flex-none">
          <button 
            onClick={() => void runSearch()} 
            disabled={isSearching} 
            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 pt-4 flex flex-wrap gap-2">
          {[
            'give me whatsapp related messages',
            'show all calls made to ketan',
            'show deleted events after device power off',
            'location events near toll gate',
          ].map((example) => (
            <button
              key={example}
              onClick={() => applyExample(example)}
              className="text-xs px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              {example}
            </button>
          ))}
        </div>
        {searchMeta ? (
          <div className="m-4 border border-blue-100 bg-blue-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI Interpretation</p>
            <p className="text-sm text-slate-700 mt-1">
              <span className="font-semibold">Query:</span> {searchMeta.interpreted_query}
            </p>
            <div className="mt-3">
              <p className="text-sm font-semibold text-slate-700">Reasoning:</p>
              <ul className="mt-2 space-y-1.5">
                {explanationBullets.map((point, index) => (
                  <li key={`${point}-${index}`} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {searchApplied && !isSearching && !visibleRows.length ? (
          <div className="mx-4 mb-3 border border-amber-200 bg-amber-50 rounded-md px-3 py-2 text-sm text-amber-800">
            No related events found for this query in the current case. Try changing platform/contact keywords.
          </div>
        ) : null}
        <table className="w-full text-left border-collapse text-sm mt-2">
          <thead className="bg-slate-50 text-slate-600 sticky top-0 border-y border-slate-200 shadow-sm z-10">
            <tr>
              <th className="p-4 font-medium">Source</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Timestamp</th>
              <th className="p-4 font-medium">Preview snippet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {visibleRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                <td className="p-4 font-medium flex items-center gap-2">
                  <FileBox className="w-4 h-4 text-slate-400" /> 
                  {row.metadata?.['source'] ? String(row.metadata['source']) : 'Event'}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${eventTypeClass(row.event_type)}`}>{row.event_type}</span>
                </td>
                <td className="p-4 font-mono text-xs text-slate-500">{new Date(row.timestamp).toLocaleString()}</td>
                <td className="p-4 truncate max-w-xs">{row.raw_text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}