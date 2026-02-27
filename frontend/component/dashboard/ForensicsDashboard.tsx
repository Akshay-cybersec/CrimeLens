'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FolderPlus, 
  Upload, 
  Database, 
  Cpu, 
  LayoutDashboard, 
  Search, 
  FileText, 
  Bell,
  Settings,
  User,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { caseService } from '@/services/caseService';
import { insightService } from '@/services/insightService';
import type { EvidenceResponse, InsightResponse, SimilarCaseResponse, TimelineResponse } from '@/types/api';

// --- Import separated view components ---
import IntelligenceDashboardView from '../dashboard/views/IntelligenceDashboardView';
import CreateCaseView from './views/CreateCaseView';
import UploadDataView from './views/UploadDataView';
import ParsedDataView from './views/ParsedDataView';
import AIAnalysisView from './views/AIAnalysisView';
import ReviewEvidenceView from './views/ReviewEvidenceView';
import ExportReportView from './views/ExportReportView';

// --- Types ---
type FlowStep = {
  id: string;
  label: string;
  icon: React.ElementType;
};

// --- Configuration ---
const FLOW_STEPS: FlowStep[] = [
  { id: 'dashboard', label: 'Intelligence Dashboard', icon: LayoutDashboard },
  { id: 'create', label: 'Create Case', icon: FolderPlus },
  { id: 'upload', label: 'Upload UFDR Data', icon: Upload },
  { id: 'parse', label: 'View Parsed Data', icon: Database },
  { id: 'analyze', label: 'Run AI Analysis', icon: Cpu },
  { id: 'evidence', label: 'Review Evidence', icon: Search },
  { id: 'export', label: 'Export Report', icon: FileText },
];

export default function ForensicsDashboard() {
  const [activeStep, setActiveStep] = useState<string>('dashboard');
  const [caseId, setCaseId] = useState<string>('');
  const [insights, setInsights] = useState<InsightResponse[]>([]);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [similarCases, setSimilarCases] = useState<SimilarCaseResponse[]>([]);
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromQuery = searchParams.get('case_id');
    const fromStorage = typeof window !== 'undefined' ? localStorage.getItem('active_case_id') : null;
    const nextCaseId = fromQuery || fromStorage || '';
    if (nextCaseId) {
      setCaseId(nextCaseId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_case_id', nextCaseId);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!caseId) {
      return;
    }

    const loadData = async () => {
      try {
        const [insightData, timelineData, similarData, evidenceData] = await Promise.all([
          insightService.getCaseInsights(caseId),
          caseService.getTimeline(caseId),
          caseService.getSimilarCases(caseId),
          caseService.getEvidence(caseId),
        ]);
        setInsights(insightData);
        setTimeline(timelineData);
        setSimilarCases(similarData);
        setEvidence(evidenceData);
      } catch {
        setInsights([]);
        setTimeline(null);
        setSimilarCases([]);
        setEvidence(null);
      }
    };

    void loadData();
  }, [caseId]);

  // Route back to the absolute homepage of your application
  const handleBackToHome = () => {
    router.push('/'); // Update this path if your homepage sits at a different route
  };

  const handleUploadComplete = (nextCaseId: string) => {
    setCaseId(nextCaseId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_case_id', nextCaseId);
    }
    router.replace(`/dashboard?case_id=${nextCaseId}`);
    setActiveStep('analyze');
  };

  // Dynamic content renderer based on active sidebar tab
  const renderActiveView = () => {
    switch (activeStep) {
      case 'dashboard': return <IntelligenceDashboardView caseId={caseId} timeline={timeline} evidence={evidence} insights={insights} />;
      case 'create': return <CreateCaseView />;
      case 'upload': return <UploadDataView onUploadComplete={handleUploadComplete} />;
      case 'parse': return <ParsedDataView caseId={caseId} timeline={timeline} />;
      case 'analyze': return <AIAnalysisView similarCases={similarCases} timeline={timeline} />;
      case 'evidence': return <ReviewEvidenceView evidence={evidence} />;
      case 'export': return <ExportReportView />;
      default: return <IntelligenceDashboardView caseId={caseId} timeline={timeline} evidence={evidence} insights={insights} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans">
      
      {/* --- Sidebar Navigation --- */}
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Search className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">CRIME<span className="text-blue-500">LENS</span></h1>
        </div>

        <div className="px-4 py-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Case Workflow
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {FLOW_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-md transition-all duration-200 relative ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-slate-500'}`} />
                  <span className="font-medium text-sm">{step.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-sm">
          <div className="flex items-center gap-3 text-slate-400 hover:text-white cursor-pointer transition-colors">
            <Settings className="w-5 h-5" />
            <span>System Settings</span>
          </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Active Module</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {FLOW_STEPS.find(s => s.id === activeStep)?.label}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="w-px h-6 bg-slate-200"></div>
            
            {/* Back Button - Routes directly to homepage */}
            <button 
              onClick={handleBackToHome}
              className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all text-sm font-medium group mr-2"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>

            <div className="flex items-center gap-3 cursor-pointer">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-slate-700">Lead Investigator</p>
                <p className="text-xs text-slate-500">Admin</p>
              </div>
              <div className="bg-slate-200 p-2 rounded-full">
                <User className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content View Area */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto h-full">
            {renderActiveView()}
          </div>
        </div>
      </main>
    </div>
  );
}
