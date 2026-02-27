'use client';

import React from 'react';
import { UploadCloud, AlertTriangle } from 'lucide-react';

export default function UploadDataView() {
  return (
    <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-500">
      <div className="max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Extraction Data</h2>
        <p className="text-slate-500 text-sm mb-8">Securely ingest UFDR, ZIP, or RAW extraction files for parsing.</p>
        
        <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-white p-16 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group">
          <div className="bg-blue-50 text-blue-500 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Drag and drop files here</h3>
          <p className="text-slate-500 text-sm mb-6">Support for Cellebrite UFDR, MSAB XRY, and standard ZIP archives.</p>
          <button className="bg-slate-900 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
            Browse Files
          </button>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">Ensure chain of custody protocols are followed before uploading evidence to the Nexus server. Large files (50GB+) may take several minutes to verify.</p>
        </div>
      </div>
    </div>
  );
}