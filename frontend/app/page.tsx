'use client';

import React, { useState, useEffect } from 'react';

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

// --- DATA ---
const featuresData = [
  {
    title: "Digital Timeline Reconstructor 3D",
    description: "Merges data from call logs, messages, and locations. Creates an interactive hour-by-hour timeline revealing suspicious data deletion gaps.",
    icon: Icons.Clock,
    tech: "Parse UFDR JSON/XML → Timeline graph",
  },
  {
    title: "Social Network Graph Analyzer",
    description: "Maps relationships to identify hidden connections and key figures. Includes 'Burner Phone Detector' to break false alibis.",
    icon: Icons.Network,
    tech: "NetworkX + D3.js visualization",
  },
  {
    title: "Behavioral Anomaly Detection Engine",
    description: "Learns a suspect's 'normal' patterns (sleep, app usage) and uses ML to flag 'out of character' actions during the crime period.",
    icon: Icons.Activity,
    tech: "Isolation Forest ML algorithm",
  },
  {
    title: "Multi-Device Correlation Matrix",
    description: "Cross-references data from phones, laptops, and smartwatches to catch sophisticated cover-ups and confirm timelines.",
    icon: Icons.Devices,
    tech: "Cross-device data triangulation",
  },
  {
    title: "Intelligent Evidence Prioritizer",
    description: "Auto-ranks evidence by importance using ML. Highlights 'smoking gun' data to save 100+ hours of manual UFDR report reading.",
    icon: Icons.Target,
    tech: "NLP + Custom Scoring Algorithm",
  }
];

// --- MAIN PAGE COMPONENT ---
export default function CrimeLensHome() {
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

  const handleDashboardClick = () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
    } else {
      alert("Redirecting to CrimeLens Dashboard...");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#E6EDF3] font-sans selection:bg-[#00C2FF] selection:text-[#0B0F14] relative overflow-hidden">
      <CustomStyles />
      
      {/* Dynamic Cursor Glow Effect */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 ease-in-out"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 194, 255, 0.04), transparent 80%)`
        }}
      />

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 z-40 w-full bg-[#121821]/80 backdrop-blur-xl border-b border-[#1F2A36] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 group cursor-pointer animate-fade-in-up" style={{ animationDelay: '0s' }}>
              <div className="text-[#00C2FF] group-hover:drop-shadow-[0_0_8px_rgba(0,194,255,0.8)] transition-all duration-300">
                <Icons.Shield />
              </div>
              <span className="text-xl font-bold tracking-wider">CRIME<span className="text-[#00C2FF] drop-shadow-[0_0_5px_rgba(0,194,255,0.4)]">LENS</span></span>
            </div>
            
            <div className="flex items-center gap-5 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {!isLoggedIn ? (
                <>
                  <button 
                    onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
                    className="text-[#7B8794] hover:text-[#E6EDF3] transition-colors text-sm font-medium relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-[#00C2FF] after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
                  >
                    Operator Login
                  </button>
                  <button 
                    onClick={handleDashboardClick}
                    className="relative overflow-hidden group bg-[#00C2FF]/5 border border-[#00C2FF]/50 px-5 py-2 rounded-md text-sm font-semibold text-[#00C2FF] transition-all hover:border-[#00C2FF] hover:shadow-[0_0_15px_rgba(0,194,255,0.25)]"
                  >
                    <span className="relative z-10 group-hover:text-[#E6EDF3] transition-colors duration-300">Access Dashboard</span>
                    <div className="absolute inset-0 bg-[#00C2FF] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-0" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleDashboardClick}
                  className="bg-[#00C2FF] text-[#0B0F14] px-5 py-2 rounded-md text-sm font-bold hover:shadow-[0_0_15px_rgba(0,194,255,0.4)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  Enter Terminal
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Gradients & Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#121821_0%,_#0B0F14_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1F2A36_1px,transparent_1px),linear-gradient(to_bottom,#1F2A36_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-10" />
        <div className="scanlines" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center animate-float">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-[#161D26]/80 backdrop-blur-sm border border-[#00C2FF]/30 text-[#00C2FF] text-xs font-mono uppercase tracking-widest shadow-[0_0_15px_rgba(0,194,255,0.1)] animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
            <span className="w-2 h-2 rounded-full bg-[#00C2FF] animate-pulse" />
            Next-Gen UFDR Analytics Engine
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.3s' }}>
            Uncover the Truth with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C2FF] via-[#22C55E] to-[#00C2FF] animate-gradient-x drop-shadow-[0_0_20px_rgba(0,194,255,0.2)]">
              AI Forensics
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-[#7B8794] text-lg md:text-xl mb-10 leading-relaxed animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.4s' }}>
            Process massive UFDR extraction reports in seconds. Reconstruct timelines, map criminal networks, and find the smoking gun before the trail goes cold.
          </p>
          
          <div className="flex justify-center gap-4 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.5s' }}>
            <button 
              onClick={handleDashboardClick}
              className="group relative bg-[#00C2FF] text-[#0B0F14] px-8 py-4 rounded-md font-bold text-lg overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(0,194,255,0.3)] hover:-translate-y-1"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] skew-x-12" />
              <style dangerouslySetInnerHTML={{__html: `@keyframes shimmer { 100% { transform: translateX(200%); } }`}} />
              Start Investigation
            </button>
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION (Animated Timeline) --- */}
      <section className="py-24 bg-[#0B0F14] relative border-t border-[#1F2A36]/50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[#00C2FF]/30 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#E6EDF3]">Core Capabilities</h2>
            <p className="text-[#7B8794] max-w-2xl mx-auto text-lg">Real-time UFDR extraction tracking and analysis matrix.</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-stretch">
            
            {/* Left Column: Timeline Navigation */}
            <div className="w-full lg:w-1/3 relative flex flex-col justify-between">
              {/* Vertical Line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-[#1F2A36] z-0" />
              
              {featuresData.map((feature, idx) => {
                const isActive = activeFeature === idx;
                return (
                  <div 
                    key={idx}
                    onClick={() => setActiveFeature(idx)}
                    className={`relative z-10 pl-12 py-4 cursor-pointer transition-all duration-300 group ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                  >
                    {/* Timeline Node */}
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[32px] h-[32px] rounded-full border-2 flex items-center justify-center transition-all duration-500 bg-[#0B0F14]
                      ${isActive ? 'border-[#00C2FF] shadow-[0_0_15px_rgba(0,194,255,0.4)]' : 'border-[#1F2A36] group-hover:border-[#00C2FF]/50'}`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${isActive ? 'bg-[#00C2FF] scale-100' : 'bg-transparent scale-0'}`} />
                    </div>
                    
                    <h3 className={`font-bold text-lg transition-colors duration-300 ${isActive ? 'text-[#00C2FF]' : 'text-[#E6EDF3]'}`}>
                      {feature.title}
                    </h3>
                    
                    {/* Active Progress Bar indicator (Visual cue for the 1s timer) */}
                    {isActive && (
                      <div className="absolute bottom-0 left-12 right-4 h-px bg-[#1F2A36] overflow-hidden">
                        <div className="h-full bg-[#00C2FF] animate-[progress_1s_linear_infinite]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Column: Active Feature Display Card */}
            <div className="w-full lg:w-2/3 h-full relative perspective-1000">
              <div className="bg-[#121821]/80 backdrop-blur-md border border-[#00C2FF]/30 rounded-2xl p-8 md:p-12 shadow-[0_0_40px_rgba(0,194,255,0.1)] relative overflow-hidden flex flex-col justify-center min-h-[350px] transition-all duration-500">
                
                {/* Cyber corner accents */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#00C2FF]/50 rounded-tl-2xl" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#00C2FF]/50 rounded-br-2xl" />
                
                {featuresData.map((feature, idx) => {
                  const ActiveIcon = feature.icon;
                  return (
                    <div 
                      key={idx} 
                      className={`absolute inset-0 p-8 md:p-12 flex flex-col justify-center transition-all duration-500 ease-in-out
                        ${activeFeature === idx ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-12 pointer-events-none'}`}
                    >
                      <div className="flex items-center gap-6 mb-6">
                        <div className="w-16 h-16 bg-[#0B0F14] border border-[#00C2FF] rounded-xl flex items-center justify-center text-[#00C2FF] shadow-[0_0_20px_rgba(0,194,255,0.2)]">
                          <ActiveIcon />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-[#E6EDF3]">{feature.title}</h3>
                      </div>
                      
                      <p className="text-[#7B8794] text-lg leading-relaxed mb-8 max-w-2xl">
                        {feature.description}
                      </p>
                      
                      <div className="mt-auto pt-6 border-t border-[#1F2A36]">
                        <div className="inline-flex items-center gap-3 bg-[#0B0F14] px-4 py-2 rounded-lg border border-[#1F2A36]">
                          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                          <span className="text-[#7B8794] text-sm font-mono">Tech Stack:</span> 
                          <span className="text-[#22C55E] text-sm font-mono font-semibold">{feature.tech}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#121821] py-12 border-t border-[#1F2A36]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-[#7B8794]">
            <div className="text-[#00C2FF] opacity-80">
              <Icons.Shield />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-wider text-[#E6EDF3]">CRIME<span className="text-[#00C2FF]">LENS</span></span>
              <span className="text-xs">© {new Date().getFullYear()} Advanced Forensic Systems.</span>
            </div>
          </div>
          <div className="flex gap-8 text-sm text-[#7B8794] font-medium">
            <a href="#" className="hover:text-[#00C2FF] transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-[#00C2FF] hover:after:w-full after:transition-all after:duration-300">Privacy Protocol</a>
            <a href="#" className="hover:text-[#00C2FF] transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-[#00C2FF] hover:after:w-full after:transition-all after:duration-300">Terms of Service</a>
            <a href="#" className="hover:text-[#00C2FF] transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-[#00C2FF] hover:after:w-full after:transition-all after:duration-300">API Documentation</a>
          </div>
        </div>
      </footer>

      {/* --- AUTH MODAL --- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#0B0F14]/90 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <style dangerouslySetInnerHTML={{__html: `@keyframes fadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(12px); } }`}} />
          
          <div className="relative w-full max-w-md bg-[#121821] border border-[#1F2A36] rounded-2xl shadow-[0_0_50px_rgba(0,194,255,0.1)] overflow-hidden transform transition-all">
            
            {/* Modal Glow Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-[#00C2FF] to-transparent opacity-50" />

            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-[#1F2A36]/50">
              <h2 className="text-xl font-bold text-[#E6EDF3] flex items-center gap-2">
                <Icons.Shield />
                {authMode === 'login' ? 'System Authorization' : 'Register Operator'}
              </h2>
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="text-[#7B8794] hover:text-[#FF3B3B] hover:bg-[#FF3B3B]/10 p-1 rounded-md transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              <div className="bg-[#FFB020]/10 border border-[#FFB020]/20 text-[#FFB020] px-4 py-3 rounded-lg text-xs font-mono mb-8 flex items-start gap-3">
                <span className="text-lg leading-none pt-0.5">⚠️</span>
                <p>WARNING: Authorized personnel only. Access to the UFDR Terminal requires active credentials.</p>
              </div>

              <form className="space-y-5" onSubmit={(e) => {
                e.preventDefault();
                setIsLoggedIn(true);
                setIsAuthModalOpen(false);
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}