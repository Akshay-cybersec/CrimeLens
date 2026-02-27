'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, AlertTriangle, FileBox, X, CheckCircle2 } from 'lucide-react';
import { caseService } from '@/services/caseService';

type Props = {
  onUploadComplete?: (caseId: string) => void;
};

export default function UploadDataView({ onUploadComplete }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Utility: Format File Size ---
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // --- Handlers ---
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTriggerFileSelect = () => {
    if (!selectedFile) {
      fileInputRef.current?.click();
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the upload click area
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMockUpload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedFile) {
      return;
    }

    setIsUploading(true);

    // Keep existing progress UX while making real API calls.
    setUploadProgress(10);
    try {
      const title = selectedFile.name.replace(/\.[^/.]+$/, '') || `UFDR-${Date.now()}`;
      const uploaded = await caseService.uploadCase(selectedFile, title, `Uploaded UFDR file: ${selectedFile.name}`);
      setUploadProgress(70);
      try {
        await caseService.buildBehavioralIndex(uploaded.case_id);
      } catch {
        // Allow timeline flow even if behavioral indexing fails.
      }
      setUploadProgress(100);

      if (typeof window !== 'undefined') {
        localStorage.setItem('active_case_id', uploaded.case_id);
      }

      setTimeout(() => {
        alert("File successfully ingested into Nexus DB.");
        setSelectedFile(null);
        setIsUploading(false);
        setUploadProgress(0);
        onUploadComplete?.(uploaded.case_id);
      }, 500);
    } catch {
      setIsUploading(false);
      setUploadProgress(0);
      alert('Upload failed. Please verify UFDR file and try again.');
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-start pt-12 animate-in fade-in duration-500 w-full">
      <div className="max-w-3xl w-full">
        
        {/* Header Area */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Upload Extraction Data</h2>
          <p className="text-slate-500">Securely ingest UFDR, ZIP, or RAW extraction files for deep parsing.</p>
        </div>
        
        {/* Drag & Drop Zone */}
        <div 
          onClick={handleTriggerFileSelect}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all duration-200 ${
            isDragging 
              ? 'border-blue-500 bg-blue-50/50' 
              : selectedFile 
                ? 'border-slate-200 bg-white'
                : 'border-slate-300 bg-white hover:bg-slate-50 cursor-pointer'
          } shadow-sm`}
        >
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".zip,.ufdr,.raw,.bin"
          />

          {!selectedFile ? (
            // --- STATE: No File Selected ---
            <div className="flex flex-col items-center pointer-events-none">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-5 shadow-sm">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Drag and drop files here</h3>
              <p className="text-slate-500 text-sm mb-8 max-w-sm">
                Support for Cellebrite UFDR, MSAB XRY, and standard ZIP archives up to 100GB.
              </p>
              <button 
                type="button"
                className="bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm pointer-events-auto"
              >
                Browse Files
              </button>
            </div>
          ) : (
            // --- STATE: File Selected ---
            <div className="flex flex-col items-center w-full max-w-md">
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-full mb-4 shadow-sm">
                <FileBox className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 truncate w-full px-4" title={selectedFile.name}>
                {selectedFile.name}
              </h3>
              <p className="text-slate-500 text-sm mb-6 font-mono">
                {formatBytes(selectedFile.size)}
              </p>

              {/* Progress Bar (Visible during mock upload) */}
              {isUploading && (
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button 
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                  className="flex-1 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleMockUpload}
                  disabled={isUploading}
                  className="flex-[2] bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isUploading ? (
                    `Uploading... ${uploadProgress}%`
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" /> 
                      Upload to Server
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Warning Alert Box */}
        <div className="mt-6 bg-blue-50/50 border border-blue-200 rounded-xl p-5 flex items-start gap-4 shadow-sm">
          <div className="bg-blue-100 p-2 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 mb-1">Chain of Custody Notice</h4>
            <p className="text-sm text-blue-800 leading-relaxed">
              Ensure chain of custody protocols are followed before uploading evidence to the Nexus secure server. Large extraction files (50GB+) may take several minutes to verify hash signatures.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
