'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FolderPlus, 
  Upload, 
  Database, 
  Cpu, 
  LayoutDashboard, 
  Search, 
  FileText, 
  ShieldAlert,
  GitBranch,
  Scale,
  Bell,
  Settings,
  User,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { caseService } from '@/services/caseService';
import { insightService } from '@/services/insightService';
import type { CaseListItem, CaseOverview, ConnectionGraphResponse, DashboardMetrics, EvidenceResponse, InsightResponse, SimilarCaseResponse, TimelineResponse } from '@/types/api';

// --- Import separated view components ---
import IntelligenceDashboardView from '../dashboard/views/IntelligenceDashboardView';
import CreateCaseView from './views/CreateCaseView';
import UploadDataView from './views/UploadDataView';
import ParsedDataView from './views/ParsedDataView';
import AIAnalysisView from './views/AIAnalysisView';
import InsightsEngineView from './views/InsightsEngineView';
import GraphLinkingView from './views/GraphLinkingView';
import ReviewEvidenceView from './views/ReviewEvidenceView';
import ExportReportView from './views/ExportReportView';
import CaseDecisionBetaView from './views/CaseDecisionBetaView';

// --- Types ---
type FlowStep = {
  id: string;
  label: string;
  icon: React.ElementType;
};

// --- Configuration ---
const FLOW_STEPS: FlowStep[] = [
  { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
  { id: 'create', label: 'Initialize Investigation', icon: FolderPlus },
  { id: 'upload', label: 'Inject Extraction', icon: Upload },
  { id: 'parse', label: 'Data Matrix', icon: Database },
  { id: 'analyze', label: 'AI Deep Scan', icon: Cpu },
  { id: 'graph', label: 'Graph Linking', icon: GitBranch },
  { id: 'insights', label: 'Insights Engine', icon: ShieldAlert },
  { id: 'evidence', label: 'Flag Anamolies', icon: Search },
  { id: 'decision-beta', label: 'Case Decision (Beta)', icon: Scale },
  { id: 'export', label: 'Export Report', icon: FileText },
];

export default function ForensicsDashboard() {
  const [activeStep, setActiveStep] = useState<string>('dashboard');
  const [caseId, setCaseId] = useState<string>('');
  const [insights, setInsights] = useState<InsightResponse[]>([]);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [similarCases, setSimilarCases] = useState<SimilarCaseResponse[]>([]);
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [caseOverview, setCaseOverview] = useState<CaseOverview | null>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [connectionGraph, setConnectionGraph] = useState<ConnectionGraphResponse | null>(null);
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
    const loadMetrics = async () => {
      try {
        const data = await caseService.getDashboardMetrics();
        setDashboardMetrics(data);
      } catch {
        setDashboardMetrics(null);
      }
    };
    void loadMetrics();
  }, []);

  useEffect(() => {
    const loadCases = async () => {
      try {
        const rows = await caseService.listCases(200);
        setCases(rows);
        const activeFromStorage = typeof window !== 'undefined' ? localStorage.getItem('active_case_id') : '';
        const activeFromQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('case_id') : '';
        if (!activeFromStorage && !activeFromQuery && rows.length > 0) {
          setCaseId(rows[0].case_id);
        }
      } catch {
        setCases([]);
      }
    };
    void loadCases();
  }, []);

  const reloadCaseData = useCallback(async (targetCaseId: string) => {
    const [insightData, timelineData, similarData, evidenceData, overviewData, graphData] = await Promise.allSettled([
      insightService.getCaseInsights(targetCaseId),
      caseService.getTimeline(targetCaseId),
      caseService.getSimilarCases(targetCaseId),
      caseService.getEvidence(targetCaseId),
      caseService.getCaseOverview(targetCaseId),
      caseService.getConnectionGraph(targetCaseId),
    ]);

    setInsights(insightData.status === 'fulfilled' ? insightData.value : []);
    setTimeline(timelineData.status === 'fulfilled' ? timelineData.value : null);
    setSimilarCases(similarData.status === 'fulfilled' ? similarData.value : []);
    setEvidence(evidenceData.status === 'fulfilled' ? evidenceData.value : null);
    setCaseOverview(overviewData.status === 'fulfilled' ? overviewData.value : null);
    setConnectionGraph(graphData.status === 'fulfilled' ? graphData.value : null);
  }, []);

  useEffect(() => {
    if (!caseId) {
      return;
    }
    void reloadCaseData(caseId);
  }, [caseId, reloadCaseData]);

  const handleRefreshResponses = useCallback(async () => {
    if (!caseId) return;
    await reloadCaseData(caseId);
  }, [caseId, reloadCaseData]);

  const handleRegenerateCaseDecision = useCallback(async () => {
    if (!caseId) return;
    await insightService.regenerateInsights(caseId);
    await reloadCaseData(caseId);
  }, [caseId, reloadCaseData]);

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

  const handleSelectCase = (nextCaseId: string) => {
    setCaseId(nextCaseId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_case_id', nextCaseId);
    }
    router.replace(`/dashboard?case_id=${nextCaseId}`);
  };

  // Dynamic content renderer based on active sidebar tab
  const renderActiveView = () => {
    switch (activeStep) {
      case 'dashboard': return <IntelligenceDashboardView caseId={caseId} timeline={timeline} evidence={evidence} insights={insights} cases={cases} overview={caseOverview} demoMetrics={dashboardMetrics} />;
      case 'create': return <CreateCaseView cases={cases} selectedCaseId={caseId} onSelectCase={handleSelectCase} caseOverview={caseOverview} />;
      case 'upload': return <UploadDataView onUploadComplete={handleUploadComplete} />;
      case 'parse': return <ParsedDataView caseId={caseId} timeline={timeline} />;
      case 'analyze': return <AIAnalysisView similarCases={similarCases} timeline={timeline} insights={insights} evidence={evidence} />;
      case 'graph': return <GraphLinkingView graph={connectionGraph} timeline={timeline} />;
      case 'insights': return <InsightsEngineView caseId={caseId} insights={insights} />;
      case 'evidence': return <ReviewEvidenceView caseId={caseId} evidence={evidence} onRegenerateResponse={handleRefreshResponses} />;
      case 'decision-beta': return <CaseDecisionBetaView caseId={caseId} overview={caseOverview} timeline={timeline} insights={insights} evidence={evidence} similarCases={similarCases} onRegenerateResponse={handleRegenerateCaseDecision} />;
      case 'export': return <ExportReportView caseId={caseId} timeline={timeline} evidence={evidence} insights={insights} overview={caseOverview} similarCases={similarCases} />;
      default: return <IntelligenceDashboardView caseId={caseId} timeline={timeline} evidence={evidence} insights={insights} cases={cases} overview={caseOverview} demoMetrics={dashboardMetrics} />;
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
