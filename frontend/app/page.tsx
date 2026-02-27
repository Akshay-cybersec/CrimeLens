'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Added Next.js router

// --- CUSTOM CSS FOR ANIMATIONS (Injected to keep it single-file) ---
const CustomStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }
    @keyframes gradientX {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-gradient-x { background-size: 200% 200%; animation: gradientX 5s ease infinite; }
    .scanlines {
      background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
      background-size: 100% 4px;
      position: absolute; inset: 0; pointer-events: none; z-index: 20; opacity: 0.3;
    }
    @keyframes progress {
      from { width: 0%; }
      to { width: 100%; }
    }
  `}} />
);

// --- ICON COMPONENTS ---
const Icons = {
  Shield: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  Network: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path></svg>,
  Activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  Devices: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>,
  Target: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

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

// --- MAIN PAGE COMPONENT ---
export default function CrimeLensHome() {
  const router = useRouter(); // Initialize Next.js router
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // New state for timeline feature
  const [activeFeature, setActiveFeature] = useState(0);

  // Handle Dynamic Cursor Flow
  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  // Auto-advance timeline (1 second interval)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % featuresData.length);
    }, 1000); // 1000ms = 1 second
    
    return () => clearInterval(timer);
  }, []);

  // --- UPDATED NAVIGATION LOGIC ---
  const handleDashboardClick = () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
    } else {
      // Routes to the dashboard page
      router.push('/dashboard'); 
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans">
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Search className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Nexus<span className="text-blue-500">Intel</span>
          </h1>
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

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Active Case</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">CASE-2026-0042</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>
            <div className="w-px h-6 bg-slate-200" />
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

        <div className="flex-1 overflow-auto p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {activeStep === 'dashboard' ? (
              <IntelligenceDashboardView />
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                {React.createElement(FLOW_STEPS.find((s) => s.id === activeStep)?.icon || Database, {
                  className: 'w-16 h-16 mb-4 text-slate-300',
                })}
                <h2 className="text-2xl font-semibold text-slate-600">{FLOW_STEPS.find((s) => s.id === activeStep)?.label}</h2>
                <p className="mt-2 text-sm">This module is currently under development.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Artifacts', value: '142,893', color: 'border-blue-500' },
          { label: 'Flagged Messages', value: '412', color: 'border-red-500' },
          { label: 'Media Files', value: '8,431', color: 'border-purple-500' },
          { label: 'Location Pins', value: '1,024', color: 'border-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-t-4 ${stat.color}`}>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
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

              {/* --- UPDATED FORM ONSUBMIT --- */}
              <form className="space-y-5" onSubmit={(e) => {
                e.preventDefault();
                setIsLoggedIn(true);
                setIsAuthModalOpen(false);
                router.push('/dashboard'); // Route directly on successful login
              }}>
                <div>
                  <label className="block text-xs font-mono text-[#7B8794] mb-2 uppercase tracking-wider">Badge / Email ID</label>
                  <input 
                    type="email" 
                    required
                    className="w-full bg-[#0B0F14] border border-[#1F2A36] rounded-lg px-4 py-3 text-[#E6EDF3] focus:outline-none focus:border-[#00C2FF] focus:ring-1 focus:ring-[#00C2FF] transition-all placeholder:text-[#4A5568]"
                    placeholder="agent@agency.gov"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#7B8794] mb-2 uppercase tracking-wider">Clearance Password</label>
                  <input 
                    type="password" 
                    required
                    className="w-full bg-[#0B0F14] border border-[#1F2A36] rounded-lg px-4 py-3 text-[#E6EDF3] focus:outline-none focus:border-[#00C2FF] focus:ring-1 focus:ring-[#00C2FF] transition-all placeholder:text-[#4A5568]"
                    placeholder="••••••••"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#00C2FF] text-[#0B0F14] font-bold py-3 rounded-lg hover:bg-[#00C2FF] hover:shadow-[0_0_20px_rgba(0,194,255,0.4)] hover:-translate-y-0.5 transition-all mt-4 duration-300"
                >
                  {authMode === 'login' ? 'Authenticate' : 'Request Access'}
                </button>
              </form>

              {/* Toggle Mode */}
              <div className="mt-8 text-center text-sm text-[#7B8794]">
                {authMode === 'login' ? "Don't have clearance? " : "Already registered? "}
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-[#00C2FF] hover:text-[#E6EDF3] font-medium transition-colors hover:underline underline-offset-4"
                >
                  {authMode === 'login' ? 'Submit request here' : 'Login here'}
                </button>
              </div>
              <p className="text-sm text-amber-700 mt-2">
                Device GPS coordinates contradict cellular tower logs between 02:00 and 04:00 AM.
              </p>
            </div>
          </div>
        </div>

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
