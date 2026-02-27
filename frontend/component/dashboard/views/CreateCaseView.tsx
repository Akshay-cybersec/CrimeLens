'use client';

import React from 'react';

export default function CreateCaseView() {
  return (
    <div className="max-w-3xl bg-white border border-slate-200 rounded-xl shadow-sm p-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Initialize New Case</h2>
      <form className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Case Identifier</label>
            <input 
              type="text" 
              placeholder="e.g. CASE-2026-0043" 
              className="w-full border border-slate-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Lead Investigator</label>
            <input 
              type="text" 
              placeholder="Agent Name" 
              className="w-full border border-slate-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Case Description / Notes</label>
          <textarea 
            rows={4} 
            placeholder="Brief summary of the incident..." 
            className="w-full border border-slate-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          ></textarea>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Seized Device Type</label>
          <select className="w-full border border-slate-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option>Mobile Device (iOS)</option>
            <option>Mobile Device (Android)</option>
            <option>Laptop/PC</option>
            <option>Other Media</option>
          </select>
        </div>
        <div className="pt-4 flex justify-end">
          <button 
            type="button" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md text-sm font-semibold transition-colors"
          >
            Save & Proceed
          </button>
        </div>
      </form>
    </div>
  );
}