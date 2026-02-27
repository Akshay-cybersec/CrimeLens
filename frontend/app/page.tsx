'use client';

import React, { useState } from 'react';
import { 
  FolderPlus, 
  Upload, 
  Database, 
  Cpu, 
  LayoutDashboard, 
  Search, 
  FileText, 
  Archive,
  Bell,
  Settings,
  User,
  ChevronRight
} from 'lucide-react';

// --- Types ---
type FlowStep = {
  id: string;
  label: string;
  icon: React.ElementType;
};

// --- Configuration ---
const FLOW_STEPS: FlowStep[] = [
  { id: 'create', label: 'Create Case', icon: FolderPlus },
  { id: 'upload', label: 'Upload UFDR Data', icon: Upload },
  { id: 'parse', label: 'View Parsed Data', icon: Database },
  { id: 'analyze', label: 'Run AI Analysis', icon: Cpu },
  { id: 'dashboard', label: 'Intelligence Dashboard', icon: LayoutDashboard },
  { id: 'evidence', label: 'Review Evidence', icon: Search },
  { id: 'export', label: 'Export Report', icon: FileText },
  { id: 'close', label: 'Close Case', icon: Archive },
];

export default function ForensicsDashboard() {
  const [activeStep, setActiveStep] = useState<string>('dashboard');

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans">
      
      {/* --- Sidebar Navigation --- */}
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Search className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">Nexus<span className="text-blue-500">Intel</span></h1>
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
                className={`w-full flex items-center justify-between px-3 py-3 rounded-md transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-slate-500'}`} />
                  <span className="font-medium text-sm">{step.label}</span>
                </div>
                {/* Connecting line indicator for flow */}
                {index < FLOW_STEPS.length - 1 && (
                   <div className="w-1 h-4 border-r border-slate-700 absolute left-8 mt-10 hidden lg:block" />
                )}
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
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Active Case</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">CASE-2026-0042</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="w-px h-6 bg-slate-200"></div>
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

        {/* Dynamic Content View */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {activeStep === 'dashboard' ? (
              <IntelligenceDashboardView />
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                {React.createElement(FLOW_STEPS.find(s => s.id === activeStep)?.icon || Database, { className: "w-16 h-16 mb-4 text-slate-300" })}
                <h2 className="text-2xl font-semibold text-slate-600">
                  {FLOW_STEPS.find(s => s.id === activeStep)?.label}
                </h2>
                <p className="mt-2 text-sm">This module is currently under development.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Sub-component: Mock Intelligence Dashboard ---
function IntelligenceDashboardView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Intelligence Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">AI-driven insights and parsed artifact overview.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium transition-colors">
          Generate Quick Report
        </button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Artifacts', value: '142,893', color: 'border-blue-500' },
          { label: 'Flagged Messages', value: '412', color: 'border-red-500' },
          { label: 'Media Files', value: '8,431', color: 'border-purple-500' },
          { label: 'Location Pins', value: '1,024', color: 'border-emerald-500' }
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-t-4 ${stat.color}`}>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* AI Insights Panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800">AI Threat Analysis</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex justify-between items-start">
                <span className="text-sm font-semibold text-red-800">High Risk Keyword Match</span>
                <span className="text-xs font-mono text-red-600 bg-red-100 px-2 py-1 rounded">Score: 98%</span>
              </div>
              <p className="text-sm text-red-700 mt-2">Suspicious communication patterns detected across WhatsApp and Telegram regarding external file transfers.</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
              <div className="flex justify-between items-start">
                <span className="text-sm font-semibold text-amber-800">Anomalous Location Data</span>
                <span className="text-xs font-mono text-amber-600 bg-amber-100 px-2 py-1 rounded">Score: 82%</span>
              </div>
              <p className="text-sm text-amber-700 mt-2">Device GPS coordinates contradict cellular tower logs between 02:00 and 04:00 AM.</p>
            </div>
          </div>
        </div>

        {/* Extraction Summary */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
           <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-4">UFDR Summary</h3>
           <ul className="space-y-3 text-sm">
             <li className="flex justify-between">
               <span className="text-slate-500">Device Model</span>
               <span className="font-medium text-slate-800">iPhone 14 Pro</span>
             </li>
             <li className="flex justify-between">
               <span className="text-slate-500">OS Version</span>
               <span className="font-medium text-slate-800">iOS 17.2.1</span>
             </li>
             <li className="flex justify-between">
               <span className="text-slate-500">Extraction Type</span>
               <span className="font-medium text-slate-800">Full File System</span>
             </li>
             <li className="flex justify-between">
               <span className="text-slate-500">Time to Parse</span>
               <span className="font-medium text-slate-800">42m 18s</span>
             </li>
           </ul>
        </div>
      </div>
    </div>
  );
}