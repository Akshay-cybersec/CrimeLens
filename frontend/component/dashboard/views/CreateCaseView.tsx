'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { caseService } from '@/services/caseService';

export default function CreateCaseView() {
  const [caseTitle, setCaseTitle] = useState('');
  const [leadInvestigator, setLeadInvestigator] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const title = caseTitle || `Case-${Date.now()}`;
      const uploaded = await caseService.uploadCase(file, title, description);
      await caseService.buildBehavioralIndex(uploaded.case_id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_case_id', uploaded.case_id);
      }
      router.push(`/dashboard?case_id=${uploaded.case_id}`);
    } catch {
      window.alert('Case upload failed. Please verify file and try again.');
    }
  };

  return (
    <div className="max-w-3xl bg-white border border-slate-200 rounded-xl shadow-sm p-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Initialize New Case</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Case Identifier</label>
            <input 
              type="text" 
              placeholder="e.g. CASE-2026-0043" 
              value={caseTitle}
              onChange={(event) => setCaseTitle(event.target.value)}
              className="w-full border border-slate-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Lead Investigator</label>
            <input 
              type="text" 
              placeholder="Agent Name" 
              value={leadInvestigator}
              onChange={(event) => setLeadInvestigator(event.target.value)}
              className="w-full border border-slate-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Case Description / Notes</label>
          <textarea 
            rows={4} 
            placeholder="Brief summary of the incident..." 
            value={description}
            onChange={(event) => setDescription(event.target.value)}
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
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md text-sm font-semibold transition-colors"
          >
            Save & Proceed
          </button>
        </div>
      </form>
    </div>
  );
}
