'use client';

import React from 'react';
import { FileText, Download } from 'lucide-react';

export default function ExportReportView() {
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
          <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">Include Executive Summary & Timeline</span>
        </label>
        
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">Include Flagged Evidence Log (12 items)</span>
        </label>
        
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">Include Full Extracted Artifact Matrix (Warning: Large File)</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
          <Download className="w-4 h-4" /> Export as PDF
        </button>
        <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg text-sm font-semibold transition-colors">
          Export JSON Data
        </button>
      </div>

    </div>
  );
}