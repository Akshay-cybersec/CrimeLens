'use client';

import React from 'react';
import { FileBox } from 'lucide-react';
import type { SimilarCaseResponse } from '@/types/api';

type Props = {
  similarCases: SimilarCaseResponse[];
};

export default function AIAnalysisView({ similarCases }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Artifact Explorer</h2>
          <p className="text-sm text-slate-500">Raw parsed data from extraction.</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Search artifacts..." 
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            readOnly
          />
          <button className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-sm transition-colors">
            Filter
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 shadow-sm">
            <tr>
              <th className="p-4 font-medium">Source</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Timestamp</th>
              <th className="p-4 font-medium">Preview snippet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {(similarCases.length ? similarCases : [{ case_id: 'N/A', crime_type: 'N/A', similarity_score: 0, explanation: 'No similar cases found.', shared_behavioral_signals: [] }]).map((row) => (
              <tr key={row.case_id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                <td className="p-4 font-medium flex items-center gap-2">
                  <FileBox className="w-4 h-4 text-slate-400" /> 
                  {row.case_id}
                </td>
                <td className="p-4">
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{row.crime_type || 'Unknown'}</span>
                </td>
                <td className="p-4 font-mono text-xs text-slate-500">{(row.similarity_score * 100).toFixed(1)}%</td>
                <td className="p-4 truncate max-w-xs">{row.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
