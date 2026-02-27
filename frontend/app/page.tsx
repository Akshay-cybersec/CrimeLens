'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ─── STYLES ────────────────────────────────────────────────────────────────────
const CustomStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    /* ── Blink Cycle — the master atom for everything atmospheric ── */
    @keyframes blinkCycle {
      0%, 100%        { opacity: 0; }
      8%              { opacity: var(--peak, 0.07); }
      55%             { opacity: var(--peak, 0.07); }
      68%             { opacity: 0; }
    }

    /* ── Fingerprint ring reveal (draw from dashoffset 600 → 0) ── */
    @keyframes ringReveal {
      from { stroke-dashoffset: 600; opacity: 0; }
      15%  { opacity: 1; }
      to   { stroke-dashoffset: 0; opacity: 1; }
    }
    @keyframes fpScanLine {
      0%   { top: -2%; opacity: 0; }
      6%   { opacity: 0.85; }
      94%  { opacity: 0.85; }
      100% { top: 102%; opacity: 0; }
    }
    @keyframes fpGlow {
      0%, 100% { filter: drop-shadow(0 0 6px rgba(0,212,255,0.25)); }
      50%      { filter: drop-shadow(0 0 22px rgba(0,212,255,0.9)); }
    }

    /* ── Lock shackle unlock / relock ── */
    @keyframes lockShackle {
      0%, 22%   { transform: translateY(0px);   }
      32%, 68%  { transform: translateY(-3.2px);}
      78%, 100% { transform: translateY(0px);   }
    }
    @keyframes lockBodyGlow {
      0%, 22%   { filter: drop-shadow(0 0 2px rgba(0,212,255,0.15)); }
      32%, 68%  { filter: drop-shadow(0 0 14px rgba(0,212,255,1));   }
      78%, 100% { filter: drop-shadow(0 0 2px rgba(0,212,255,0.15)); }
    }
    @keyframes lockFloat {
      0%, 100% { transform: translate(0px,  0px) rotate(0deg);   }
      33%      { transform: translate(5px,  -8px) rotate(1deg);  }
      66%      { transform: translate(-4px,  5px) rotate(-1deg); }
    }
    @keyframes lockCycle {
      0%, 100%  { opacity: 0; }
      6%        { opacity: var(--peak, 0.10); }
      78%       { opacity: var(--peak, 0.10); }
      88%       { opacity: 0; }
    }

    /* ── Network ── */
    @keyframes lineFlicker {
      0%, 100% { opacity: 0.03; }
      28%      { opacity: 0.14; }
      55%      { opacity: 0.04; }
    }
    @keyframes nodePulse {
      0%,100% { r: 2;   opacity: 0.07; filter: none; }
      50%     { r: 4.5; opacity: 0.80; fill: #00D4FF; filter: drop-shadow(0 0 10px rgba(0,212,255,1)); }
    }
    @keyframes nodeIdle {
      0%, 100% { opacity: 0.05; }
      50%      { opacity: 0.22; }
    }
    @keyframes statLabel {
      0%, 100%  { opacity: 0; transform: translateY(4px); }
      10%, 80%  { opacity: 0.55; transform: translateY(0); }
      90%       { opacity: 0; transform: translateY(-4px); }
    }

    /* ── Scan sweep ── */
    @keyframes scanSweep {
      0%    { top: -2%; opacity: 0; }
      5%    { opacity: 0.04; }
      90%   { opacity: 0.04; }
      100%  { top: 102%; opacity: 0; }
    }

    /* ── World map ── */
    @keyframes worldDotBlink {
      0%, 100%  { opacity: 0.03; }
      40%, 60%  { opacity: 0.14; }
    }
    @keyframes connectionDraw {
      0%    { stroke-dashoffset: 200; opacity: 0; }
      10%   { opacity: 0.12; }
      88%   { opacity: 0.12; }
      100%  { stroke-dashoffset: -200; opacity: 0; }
    }

    /* ── AI heartbeat ── */
    @keyframes heartbeat {
      0%, 100% { transform: scale(1)   translate(-50%,-50%); opacity: 0; }
      8%       { opacity: 0.045; }
      50%      { transform: scale(1.12) translate(-44%,-44%); opacity: 0.03; }
      92%      { opacity: 0; }
    }

    /* ── Gradient text ── */
    @keyframes gradientX {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* ── Misc ── */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes floatDrift {
      0%   { transform: translate(0px,   0px)  rotate(0deg);   }
      25%  { transform: translate(10px, -16px) rotate(0.8deg); }
      50%  { transform: translate(-7px,  8px)  rotate(-0.5deg);}
      75%  { transform: translate(14px,  4px)  rotate(0.4deg); }
      100% { transform: translate(0px,   0px)  rotate(0deg);   }
    }
    @keyframes shimmer   { 100% { transform: translateX(200%) skewX(-12deg); } }
    @keyframes dash      { to   { stroke-dashoffset: -1000; } }
    @keyframes progress  { 0%   { width: 0%; } 100% { width: 100%; } }
    @keyframes fadeIn    {
      from { opacity: 0; backdrop-filter: blur(0px); }
      to   { opacity: 1; backdrop-filter: blur(12px); }
    }
    @keyframes radarSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* ── Status flicker ── */
    @keyframes statusFlicker {
      0%, 100% { opacity: 0.015; }
      40%      { opacity: 0.14; text-shadow: 0 0 10px rgba(0,212,255,0.6); }
      50%      { opacity: 0.06; }
      60%      { opacity: 0.14; }
    }

    .animate-fade-in-up  { animation: fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards; }
    .animate-gradient-x  { background-size: 200% 200%; animation: gradientX 5s ease infinite; }
    .radar-sweep         { background: conic-gradient(from 0deg, transparent 70%, rgba(0,212,255,0.12) 100%); border-radius: 50%; animation: radarSpin 5s linear infinite; }

    .scanlines {
      background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.07) 50%, rgba(0,0,0,0.07));
      background-size: 100% 4px;
      position: absolute; inset: 0; pointer-events: none; z-index: 20; opacity: 0.22;
    }
    .vignette {
      position: absolute; inset: 0; pointer-events: none; z-index: 25;
      box-shadow: inset 0 0 240px rgba(10,15,28,1);
    }
    .glass-card {
      background: rgba(16,24,39,0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(0,212,255,0.05);
      transition: all 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
    }
    .glass-card:hover {
      border-color: rgba(0,212,255,0.4);
      box-shadow: 0 0 25px rgba(0,212,255,0.1), inset 0 0 15px rgba(0,212,255,0.05);
      transform: translateY(-5px);
    }
    .lock-shackle { animation: lockShackle 7s ease-in-out infinite; }
    .lock-body    { animation: lockBodyGlow 7s ease-in-out infinite; }
  `}} />
);

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icons = {
  Shield:   () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Clock:    () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Network:  () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>,
  Activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Devices:  () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Target:   () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  X:        () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Map:      () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>,
  Dollar:   () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Check:    () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const featuresData = [
  { title: "Digital Timeline Reconstructor 3D",  description: "Merges data from call logs, messages, and locations. Creates an interactive hour-by-hour timeline revealing suspicious data deletion gaps.", icon: Icons.Clock,    tech: "Parse UFDR JSON/XML → Timeline graph" },
  { title: "Social Network Graph Analyzer",      description: "Maps relationships to identify hidden connections and key figures. Includes 'Burner Phone Detector' to break false alibis.",              icon: Icons.Network,  tech: "NetworkX + D3.js visualization" },
  { title: "Behavioral Anomaly Detection Engine",description: "Learns a suspect's 'normal' patterns (sleep, app usage) and uses ML to flag 'out of character' actions during the crime period.",       icon: Icons.Activity, tech: "Isolation Forest ML algorithm" },
  { title: "Multi-Device Correlation Matrix",    description: "Cross-references data from phones, laptops, and smartwatches to catch sophisticated cover-ups and confirm timelines.",                  icon: Icons.Devices,  tech: "Cross-device data triangulation" },
  { title: "Intelligent Evidence Prioritizer",   description: "Auto-ranks evidence by importance using ML. Highlights 'smoking gun' data to save 100+ hours of manual UFDR report reading.",            icon: Icons.Target,   tech: "NLP + Custom Scoring Algorithm" },
];

// ─── FINGERPRINT RINGS (center → outer) ───────────────────────────────────────
const FP_RINGS = [
  {rx:4,   ry:3.5,  rot:0},
  {rx:8,   ry:7,    rot:5},
  {rx:12,  ry:10.5, rot:9},
  {rx:16,  ry:14,   rot:3},
  {rx:20,  ry:17.5, rot:7},
  {rx:24,  ry:21,   rot:4},
  {rx:28,  ry:24.5, rot:8},
  {rx:32,  ry:28,   rot:2},
  {rx:36,  ry:31.5, rot:6},
  {rx:41,  ry:35,   rot:4,  dash:"none"},
  {rx:46,  ry:39,   rot:7,  dash:"none"},
  {rx:51,  ry:43,   rot:3,  dash:"none"},
  {rx:56,  ry:47,   rot:6,  dash:"none"},
  {rx:61,  ry:51,   rot:2,  dash:"none"},
  {rx:67,  ry:55,   rot:5,  dash:"none"},
  {rx:73,  ry:59,   rot:3,  dash:"none"},
  {rx:79,  ry:63,   rot:7,  dash:"none"},
  {rx:85,  ry:67,   rot:4,  dash:"none"},
  {rx:91,  ry:71,   rot:6,  dash:"none"},
];
const TOTAL_FP_RINGS = FP_RINGS.length;

// ─── NETWORK NODE POSITIONS ───────────────────────────────────────────────────
const NET_NODES = [
  {cx:'5%',  cy:'15%', label:'CALLS: 247',  lx:'7%',  ly:'12%'},
  {cx:'25%', cy:'40%', label:'MSGS: 1.2k',  lx:'27%', ly:'37%'},
  {cx:'65%', cy:'25%', label:'LOC: 18pts',  lx:'67%', ly:'22%'},
  {cx:'85%', cy:'75%', label:'RISK: 0.87',  lx:'87%', ly:'72%'},
  {cx:'15%', cy:'70%', label:'APPS: 34',    lx:'17%', ly:'67%'},
  {cx:'95%', cy:'15%', label:'IMEI: match', lx:'83%', ly:'12%'},
  {cx:'45%', cy:'85%', label:'GPS: 12pts',  lx:'47%', ly:'82%'},
];

// ─── FORENSIC DATA FRAGMENTS ──────────────────────────────────────────────────
const DATA_FRAGS = [
  {text:'timestamp="2024-03-14T11:22:05Z"', top:'8%',  left:'3%',  dur:'16s', delay:'0s',   peak:'0.08'},
  {text:'Lat: 19.0760 / Lon: 72.8777',      top:'18%', left:'72%', dur:'13s', delay:'3.5s', peak:'0.07'},
  {text:'CallLog: OUTGOING · 00:04:17',      top:'55%', left:'5%',  dur:'15s', delay:'1.5s', peak:'0.08'},
  {text:'RiskScore: 0.92 ██████████',        top:'72%', left:'68%', dur:'18s', delay:'5.5s', peak:'0.07'},
  {text:'UFDR_EXTRACT_ID: 4F2A-9C1B',        top:'38%', left:'80%', dur:'14s', delay:'0.8s', peak:'0.06'},
  {text:'device_hash: a3f1…e72c [VERIFIED]', top:'84%', left:'20%', dur:'17s', delay:'4s',   peak:'0.08'},
  {text:'SMS_DELETED · recovered · 3 msgs',   top:'28%', left:'1%',  dur:'12s', delay:'7s',   peak:'0.07'},
  {text:'Network: 5G · IMEI: 35-472830-*',    top:'90%', left:'55%', dur:'19s', delay:'2.5s', peak:'0.06'},
  {text:'Extracting Metadata…',               top:'48%', left:'88%', dur:'11s', delay:'6s',   peak:'0.08'},
  {text:'Building Timeline…',                 top:'62%', left:'45%', dur:'15s', delay:'9s',   peak:'0.07'},
];

// ─── WORLD DOTS / CONNECTIONS ─────────────────────────────────────────────────
const WORLD_DOTS = [
  {x:'12%',y:'30%'},{x:'15%',y:'35%'},{x:'18%',y:'28%'},{x:'22%',y:'33%'},{x:'25%',y:'38%'},{x:'20%',y:'42%'},{x:'14%',y:'45%'},
  {x:'22%',y:'55%'},{x:'25%',y:'60%'},{x:'23%',y:'65%'},{x:'28%',y:'70%'},
  {x:'44%',y:'22%'},{x:'48%',y:'25%'},{x:'50%',y:'22%'},{x:'53%',y:'28%'},{x:'46%',y:'30%'},
  {x:'46%',y:'40%'},{x:'50%',y:'45%'},{x:'48%',y:'52%'},{x:'52%',y:'58%'},{x:'44%',y:'48%'},
  {x:'60%',y:'22%'},{x:'66%',y:'25%'},{x:'70%',y:'30%'},{x:'74%',y:'28%'},{x:'78%',y:'32%'},{x:'72%',y:'38%'},{x:'62%',y:'35%'},{x:'68%',y:'40%'},
  {x:'76%',y:'62%'},{x:'80%',y:'65%'},{x:'78%',y:'70%'},
  {x:'58%',y:'18%'},{x:'64%',y:'18%'},{x:'70%',y:'20%'},{x:'56%',y:'28%'},
];
const WORLD_CONNS = [
  {x1:'18%',y1:'28%',x2:'48%',y2:'25%',delay:'0s',  dur:'10s'},
  {x1:'48%',y1:'25%',x2:'70%',y2:'30%',delay:'3s',  dur:'12s'},
  {x1:'22%',y1:'33%',x2:'25%',y2:'60%',delay:'6.5s',dur:'9s'},
  {x1:'70%',y1:'30%',x2:'78%',y2:'65%',delay:'1.5s',dur:'11s'},
  {x1:'50%',y1:'45%',x2:'68%',y2:'40%',delay:'4.5s',dur:'13s'},
  {x1:'25%',y1:'38%',x2:'46%',y2:'40%',delay:'8s',  dur:'10s'},
];

// ─── ANIMATED LOCK ─────────────────────────────────────────────────────────────
const AnimatedLock = ({ size, cycleDelay, floatDelay }: { size: number; cycleDelay: string; floatDelay: string }) => (
  <div style={{
    animation: `lockFloat 11s ease-in-out infinite ${floatDelay}, lockCycle 9s ease-in-out infinite ${cycleDelay}`,
    '--peak': '0.11',
  } as React.CSSProperties}>
    <svg viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="0.85"
      width={size} height={size}
      style={{display:'block'}}>
      {/* Body — glows on unlock */}
      <g className="lock-body">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <circle cx="12" cy="16.5" r="1.4" fill="#00D4FF" opacity="0.5"/>
        {/* Keyhole slot */}
        <line x1="12" y1="16.5" x2="12" y2="19" strokeWidth="1.2"/>
      </g>
      {/* Shackle — lifts up on unlock */}
      <g className="lock-shackle">
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </g>
    </svg>
  </div>
);

// ─── FINGERPRINT COMPONENT ────────────────────────────────────────────────────
const FingerprintBuild = () => {
  const [ringsVisible, setRingsVisible] = useState(0);
  const [phase, setPhase] = useState<'idle'|'building'|'holding'|'fading'>('idle');
  const [opacity, setOpacity] = useState(0);
  const [scanActive, setScanActive] = useState(false);

  useEffect(() => {
    const RING_INTERVAL = 180; // ms between each ring appearing
    const HOLD_TIME     = 5000;
    const FADE_TIME     = 1200;
    const PAUSE_TIME    = 2500;
    const BUILD_TOTAL   = TOTAL_FP_RINGS * RING_INTERVAL;

    let timeouts: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const clear = () => { timeouts.forEach(clearTimeout); timeouts = []; };

    const cycle = () => {
      if (cancelled) return;
      clear();

      // — Phase 1: start building —
      setPhase('building');
      setOpacity(0.06);
      setRingsVisible(0);
      setScanActive(false);

      for (let i = 1; i <= TOTAL_FP_RINGS; i++) {
        const t = setTimeout(() => {
          if (!cancelled) setRingsVisible(i);
        }, i * RING_INTERVAL);
        timeouts.push(t);
      }

      // — Phase 2: hold with scan line —
      timeouts.push(setTimeout(() => {
        if (cancelled) return;
        setPhase('holding');
        setScanActive(true);
      }, BUILD_TOTAL + 300));

      // — Phase 3: fade out —
      timeouts.push(setTimeout(() => {
        if (cancelled) return;
        setPhase('fading');
        setScanActive(false);
        setOpacity(0);
      }, BUILD_TOTAL + 300 + HOLD_TIME));

      // — Phase 4: pause then restart —
      timeouts.push(setTimeout(() => {
        if (cancelled) return;
        setRingsVisible(0);
        cycle();
      }, BUILD_TOTAL + 300 + HOLD_TIME + FADE_TIME + PAUSE_TIME));
    };

    const init = setTimeout(cycle, 800);
    return () => {
      cancelled = true;
      clearTimeout(init);
      clear();
    };
  }, []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-1"
      style={{ transition: 'opacity 1.2s ease', opacity }}
    >
      <div className="relative" style={{ width:'min(680px,88vw)', height:'min(680px,88vw)' }}>
        <svg
          viewBox="0 0 200 200"
          fill="none"
          stroke="#00D4FF"
          strokeWidth="0.65"
          className="w-full h-full"
          style={{ animation: phase==='holding' ? 'fpGlow 4s ease-in-out infinite' : 'none' }}
        >
          {/* Centre dot — always shows first */}
          <circle cx="100" cy="100" r="1.8" fill="#00D4FF"
            style={{ opacity: ringsVisible >= 1 ? 0.9 : 0, transition:'opacity 0.3s' }} />

          {/* Rings reveal one by one */}
          {FP_RINGS.map((ring, i) => (
            ringsVisible > i ? (
              <ellipse
                key={i}
                cx="100" cy="100"
                rx={ring.rx} ry={ring.ry}
                strokeDasharray="600"
                strokeDashoffset="0"
                transform={`rotate(${ring.rot}, 100, 100)`}
                style={{
                  animation: 'ringReveal 0.35s ease-out both',
                }}
              />
            ) : null
          ))}

          {/* Delta split lines — appear at ring 9 */}
          {ringsVisible >= 9 && (
            <>
              <path d="M72 142 Q90 122 100 100 Q110 122 128 142" strokeWidth="0.7"
                style={{animation:'ringReveal 0.4s ease-out both'}} />
              <path d="M62 157 Q82 132 100 100 Q118 132 138 157" strokeWidth="0.5"
                style={{animation:'ringReveal 0.4s ease-out both'}} />
            </>
          )}
          {/* Core arch line */}
          {ringsVisible >= 14 && (
            <path d="M100 40 Q115 70 100 100 Q85 70 100 40" strokeWidth="0.5" fill="none"
              style={{animation:'ringReveal 0.4s ease-out both'}} />
          )}
        </svg>

        {/* Scan line — only during 'holding' phase */}
        {scanActive && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              height: '3px',
              background: 'linear-gradient(to right, transparent, #00FFA3 30%, #00D4FF 50%, #00FFA3 70%, transparent)',
              boxShadow: '0 0 18px 5px rgba(0,212,255,0.8)',
              animation: 'fpScanLine 3s linear infinite',
              top: 0,
            }}
          />
        )}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CrimeLensHome() {
  const router = useRouter();
  const [mousePos, setMousePos]   = useState({ x: 0, y: 0 });
  const [activeFeature, setActiveFeature] = useState(0);
  const [systemStatus, setSystemStatus]   = useState("Analyzing UFDR...");
  const [pulsedNode, setPulsedNode] = useState<number|null>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => setMousePos({x:e.clientX, y:e.clientY});
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(p=>(p+1)%featuresData.length), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const items = ["Analyzing UFDR...","Extracting Metadata...","Building Timeline...","Mapping Contacts...","Verifying Hashes...","Scoring Risk Factors..."];
    let i = 0;
    const t = setInterval(() => { i=(i+1)%items.length; setSystemStatus(items[i]); }, 3500);
    return () => clearInterval(t);
  }, []);

  // Random node pulse every 3-4 seconds
  useEffect(() => {
    const fire = () => {
      const idx = Math.floor(Math.random() * NET_NODES.length);
      setPulsedNode(idx);
      setTimeout(() => setPulsedNode(null), 1500);
    };
    const t = setInterval(fire, 3200 + Math.random() * 800);
    return () => clearInterval(t);
  }, []);

  const handleDashboard = () => {
    router.push('/login');
  };

  return (
    <div
      className="min-h-screen bg-[#0A0F1C] text-[#E6EDF3] relative overflow-x-hidden"
      style={{fontFamily:"'Rajdhani',sans-serif", userSelect:'none'}}
    >
      <CustomStyles />

      {/* Cursor glow */}
      <div className="pointer-events-none fixed inset-0 z-30"
        style={{background:`radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,212,255,0.05), transparent 80%)`}} />

      {/* ─────────────────── NAVBAR ─────────────────── */}
      <nav className="fixed top-0 z-50 w-full bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-[#1F2A36]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 group cursor-pointer animate-fade-in-up" style={{animationDelay:'0s'}}>
              <div className="text-[#00D4FF] group-hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.8)] transition-all duration-300">
                <Icons.Shield />
              </div>
              <span className="text-xl font-bold tracking-wider">CRIME<span className="text-[#00D4FF] drop-shadow-[0_0_5px_rgba(0,212,255,0.4)]">LENS</span></span>
            </div>
            <div className="flex items-center gap-5 animate-fade-in-up" style={{animationDelay:'0.1s'}}>
              <button onClick={handleDashboard}
                className="relative overflow-hidden group bg-[#00D4FF]/5 border border-[#00D4FF]/50 px-5 py-2 rounded-md text-sm font-semibold text-[#00D4FF] transition-all hover:border-[#00D4FF] hover:shadow-[0_0_15px_rgba(0,212,255,0.25)]">
                <span className="relative z-10 group-hover:text-[#0A0F1C] transition-colors duration-300">Access Dashboard</span>
                <div className="absolute inset-0 bg-[#00D4FF] translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative min-h-[95vh] flex items-center justify-center pt-16 overflow-hidden bg-gradient-to-b from-[#0A0F1C] to-[#101827]">

        {/* LAYER 0 — World map dots (blink cycle) */}
        <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {WORLD_CONNS.map((c,i)=>(
            <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              stroke="#00D4FF" strokeWidth="0.6" fill="none" strokeDasharray="200"
              style={{animation:`connectionDraw ${c.dur} ease-in-out infinite ${c.delay}`}} />
          ))}
          {WORLD_DOTS.map((d,i)=>(
            <circle key={i} cx={d.x} cy={d.y} r="1.8" fill="#00D4FF"
              style={{
                '--peak':'0.12',
                animation:`worldDotBlink ${6+i%5}s ease-in-out infinite ${(i*0.45)%7}s`,
              } as React.CSSProperties} />
          ))}
        </svg>

        {/* LAYER 1 — Network graph (blink cycle lines + random node pulses) */}
        <svg className="absolute inset-0 w-full h-full z-1 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="#00D4FF" strokeWidth="0.65" fill="none"
            style={{animation:'lineFlicker 8s ease-in-out infinite'}}>
            <line x1="5%"  y1="15%" x2="25%" y2="40%"/>
            <line x1="25%" y1="40%" x2="65%" y2="25%"/>
            <line x1="65%" y1="25%" x2="85%" y2="75%"/>
            <line x1="25%" y1="40%" x2="15%" y2="70%"/>
            <line x1="65%" y1="25%" x2="95%" y2="15%"/>
            <line x1="15%" y1="70%" x2="45%" y2="85%"/>
            <line x1="45%" y1="85%" x2="85%" y2="75%"/>
          </g>
          {/* Nodes */}
          {NET_NODES.map((n,i)=>(
            <circle key={i} cx={n.cx} cy={n.cy} r="2" fill="#00D4FF"
              style={{animation: i===pulsedNode
                ? 'nodePulse 1.4s ease-in-out forwards'
                : `nodeIdle ${5+i*0.6}s ease-in-out infinite ${i*0.7}s`}} />
          ))}
          {/* Stat labels near nodes — blink cycle */}
          {NET_NODES.map((n,i)=>(
            <text key={i} x={n.lx} y={n.ly}
              fill="#00D4FF"
              fontSize="5.5"
              fontFamily="'Share Tech Mono',monospace"
              style={{
                '--peak':'0.55',
                animation:`statLabel ${9+i*1.1}s ease-in-out infinite ${i*1.4}s`,
                filter:'drop-shadow(0 0 4px rgba(0,212,255,0.8))',
              } as React.CSSProperties}>
              {n.label}
            </text>
          ))}
        </svg>

        {/* LAYER 2 — Fingerprint build animation */}
        <FingerprintBuild />

        {/* LAYER 2b — Radar sweep */}
        <div className="absolute right-[-8%] md:right-[4%] top-1/2 -translate-y-1/2 z-0 pointer-events-none"
          style={{width:'min(420px,44vw)',height:'min(420px,44vw)',
            '--peak':'0.04',
            animation:'blinkCycle 14s ease-in-out infinite 2s',
          } as React.CSSProperties}>
          <div className="absolute inset-0 border border-[#00D4FF] rounded-full" style={{opacity:0.3}} />
          <div className="absolute inset-10 border border-[#00D4FF] rounded-full" style={{opacity:0.25}} />
          <div className="absolute inset-20 border border-[#00D4FF] rounded-full" style={{opacity:0.2}} />
          <div className="absolute inset-0 radar-sweep" />
          <div className="absolute w-full h-px bg-[#00D4FF] top-1/2" style={{opacity:0.2}} />
          <div className="absolute h-full w-px bg-[#00D4FF] left-1/2" style={{opacity:0.2}} />
        </div>

        {/* LAYER 3 — Animated Lock Icons */}
        <div className="absolute z-0 pointer-events-none" style={{top:'17%',right:'21%'}}>
          <AnimatedLock size={54} cycleDelay="0s" floatDelay="0s" />
        </div>
        <div className="absolute z-0 pointer-events-none" style={{bottom:'21%',left:'17%'}}>
          <AnimatedLock size={72} cycleDelay="3.5s" floatDelay="2s" />
        </div>
        <div className="absolute z-0 pointer-events-none" style={{top:'52%',right:'5%'}}>
          <AnimatedLock size={38} cycleDelay="7s" floatDelay="4.5s" />
        </div>

        {/* LAYER 4 — Horizontal scan bar */}
        <div className="absolute left-0 right-0 pointer-events-none z-1"
          style={{
            height:'2px',
            background:'linear-gradient(to right, transparent 0%, #00D4FF 40%, #00FFA3 50%, #00D4FF 60%, transparent 100%)',
            boxShadow:'0 0 14px 3px rgba(0,212,255,0.35)',
            animation:'scanSweep 10s linear infinite',
            top:0,
          }} />

        {/* LAYER 5 — Forensic data fragments (blink cycle + float) */}
        {DATA_FRAGS.map((f,i)=>(
          <div key={i} className="absolute select-none pointer-events-none z-1"
            style={{
              top:f.top, left:f.left,
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:'10px',
              color:'#00D4FF',
              filter:'blur(1.1px)',
              whiteSpace:'nowrap',
              '--peak': f.peak,
              animation: `floatDrift ${f.dur} ease-in-out infinite ${f.delay}, blinkCycle ${f.dur} ease-in-out infinite ${f.delay}`,
            } as React.CSSProperties}>
            {f.text}
          </div>
        ))}

        {/* LAYER 6 — AI Heartbeat pulse */}
        <div className="absolute pointer-events-none mix-blend-screen z-0"
          style={{
            top:'50%', left:'50%',
            width:'950px', height:'950px',
            background:'radial-gradient(circle, #00D4FF 0%, transparent 65%)',
            animation:'heartbeat 8s ease-in-out infinite',
          }} />

        <div className="scanlines" />
        <div className="vignette" />

        {/* Status flicker */}
        <div className="absolute bottom-6 right-6 pointer-events-none z-10 text-right"
          style={{
            fontFamily:"'Share Tech Mono',monospace",
            color:'#00D4FF',
            fontSize:'11px',
            textTransform:'uppercase',
            letterSpacing:'0.1em',
            animation:'statusFlicker 3.5s ease-in-out infinite',
          }}>
          <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:'#00D4FF',marginRight:7,verticalAlign:'middle'}} />
          {systemStatus}
        </div>

        {/* ── HERO CONTENT ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-[#101827]/80 backdrop-blur-md border border-[#00D4FF]/30 text-[#00D4FF] text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(0,212,255,0.15)] animate-fade-in-up"
            style={{opacity:0,animationDelay:'0.2s',fontFamily:"'Share Tech Mono',monospace"}}>
            <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
            Live Forensic Engine Active
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 animate-fade-in-up leading-tight"
            style={{opacity:0,animationDelay:'0.3s',letterSpacing:'-0.02em'}}>
            From Digital Chaos to <br />
            <span className="text-transparent bg-clip-text animate-gradient-x"
              style={{backgroundImage:'linear-gradient(to right, #00D4FF, #00FFA3, #00D4FF)',
                filter:'drop-shadow(0 0 28px rgba(0,212,255,0.25))'}}>
              Criminal Insight
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-[#7B8794] text-lg md:text-xl mb-8 font-medium leading-relaxed animate-fade-in-up"
            style={{opacity:0,animationDelay:'0.4s'}}>
            Turn Raw UFDR Data Into Actionable Intelligence. Process extractions in seconds, map criminal networks, and find the smoking gun before the trail goes cold.
          </p>

          <div className="flex justify-center gap-6 animate-fade-in-up" style={{opacity:0,animationDelay:'0.5s'}}>
            <button onClick={handleDashboard}
              className="group relative bg-transparent border border-[#00D4FF] text-[#00D4FF] px-8 py-4 rounded-md font-bold text-lg overflow-hidden transition-all hover:bg-[#00D4FF] hover:text-[#0A0F1C] hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:-translate-y-1"
              style={{letterSpacing:'0.06em'}}>
              <div className="absolute inset-0 w-full h-full bg-white/10 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] skew-x-12" />
              Initiate Scan Protocol
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────── VISUAL PROOF ─────────────────── */}
      <section className="py-24 relative z-10 bg-[#101827] border-y border-[#1F2A36]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-[#E6EDF3] flex items-center justify-center gap-4">
              <Icons.Target /> See CrimeLens in Action
            </h2>
            <p className="text-[#7B8794] text-lg">AI-powered evidence correlation happening in real-time.</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 items-center mb-24">
            <div className="w-full lg:w-1/2 glass-card rounded-2xl p-6 relative overflow-hidden animate-fade-in-up" style={{opacity:0,animationDelay:'0.2s'}}>
              <div className="absolute inset-0" style={{background:'radial-gradient(circle at top right, rgba(255,59,59,0.08), transparent 50%)'}} />
              <div className="flex justify-between items-center border-b border-[#1F2A36] pb-4 mb-6">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF3B3B]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#FFB020]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#00FFA3]/80" />
                </div>
                <span className="text-xs text-[#7B8794]" style={{fontFamily:"'Share Tech Mono',monospace"}}>EVID-2026-099_ANALYSIS</span>
              </div>
              <div className="space-y-6 relative z-10">
                <div className="bg-[#0A0F1C]/80 border border-[#1F2A36] rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#E6EDF3]">Threat Confidence</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-[#1F2A36] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF3B3B] w-[87%]" style={{boxShadow:'0 0 10px #FF3B3B'}} />
                    </div>
                    <span className="text-[#FF3B3B] font-mono font-bold">87%</span>
                  </div>
                </div>
                <div className="h-48 bg-[#0A0F1C]/80 border border-[#1F2A36] rounded-xl relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0" style={{background:'linear-gradient(to right, #1F2A36 1px, transparent 1px), linear-gradient(to bottom, #1F2A36 1px, transparent 1px)',backgroundSize:'1rem 1rem',opacity:0.3}} />
                  <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse" style={{background:'rgba(255,59,59,0.15)'}}>
                    <div className="w-4 h-4 bg-[#FF3B3B] rounded-full" style={{boxShadow:'0 0 15px #FF3B3B'}} />
                  </div>
                  <svg className="absolute w-full h-full" style={{opacity:0.4}} preserveAspectRatio="none">
                    <path d="M 50,100 Q 150,50 250,150 T 400,100" fill="none" stroke="#00D4FF" strokeWidth="2" strokeDasharray="5,5" style={{animation:'dash 20s linear infinite'}} />
                  </svg>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2 space-y-8 animate-fade-in-up" style={{opacity:0,animationDelay:'0.4s'}}>
              {[
                {title:"Auto Timeline Reconstruction",desc:"Instantly maps events across days, flagging unexplainable gaps."},
                {title:"Network Graph Mapping",desc:"Reveals the unseen web of accomplices through metadata."},
                {title:"Suspicious Behavior Detection",desc:"ML highlights when a suspect deviates from their routine."},
                {title:"Financial Flow Tracking",desc:"Traces hidden crypto apps and banking anomalies in seconds."},
              ].map((item,i)=>(
                <div key={i} className="flex gap-4 group">
                  <div className="w-8 h-8 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/30 flex items-center justify-center flex-shrink-0 group-hover:bg-[#00D4FF] group-hover:text-[#0A0F1C] transition-colors duration-300 group-hover:shadow-[0_0_15px_rgba(0,212,255,0.4)]">
                    <Icons.Check />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-[#E6EDF3] mb-1">{item.title}</h4>
                    <p className="text-[#7B8794] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {title:"Timeline Reconstruction",icon:Icons.Clock},
              {title:"Geo-Spatial Mapping",icon:Icons.Map},
              {title:"Pattern Detection",icon:Icons.Dollar},
              {title:"Network Graphing",icon:Icons.Network},
            ].map((card,idx)=>(
              <div key={idx} className="glass-card rounded-xl p-8 flex flex-col items-center text-center animate-fade-in-up"
                style={{opacity:0,animationDelay:`${0.2+idx*0.1}s`}}>
                <div className="w-16 h-16 bg-[#0A0F1C] border border-[#1F2A36] rounded-xl flex items-center justify-center text-[#00D4FF] mb-6">
                  <card.icon />
                </div>
                <h3 className="font-bold text-lg text-[#E6EDF3] leading-snug">{card.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── CAPABILITIES ─────────────────── */}
      <section className="py-24 bg-[#0A0F1C] relative border-t border-[#1F2A36]/50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px"
          style={{background:'linear-gradient(to right, transparent, rgba(0,212,255,0.3), transparent)'}} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#E6EDF3]">Core Capabilities Framework</h2>
            <p className="text-[#7B8794] max-w-2xl mx-auto text-lg">Real-time UFDR extraction tracking and analysis matrix.</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-stretch">
            <div className="w-full lg:w-1/3 relative flex flex-col justify-between">
              <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-[#1F2A36] z-0" />
              {featuresData.map((feature,idx)=>{
                const isActive = activeFeature===idx;
                return (
                  <div key={idx} onClick={()=>setActiveFeature(idx)}
                    className={`relative z-10 pl-12 py-4 cursor-pointer transition-all duration-300 group ${isActive?'opacity-100':'opacity-50 hover:opacity-80'}`}>
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 bg-[#0A0F1C] ${isActive?'border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.4)]':'border-[#1F2A36] group-hover:border-[#00D4FF]/50'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${isActive?'bg-[#00D4FF] scale-100':'bg-transparent scale-0'}`} />
                    </div>
                    <h3 className={`font-bold text-lg transition-colors duration-300 ${isActive?'text-[#00D4FF]':'text-[#E6EDF3]'}`}>{feature.title}</h3>
                    {isActive && (
                      <div className="absolute bottom-0 left-12 right-4 h-px bg-[#1F2A36] overflow-hidden">
                        <div className="h-full bg-[#00D4FF]" style={{animation:'progress 2s linear infinite'}} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="w-full lg:w-2/3">
              <div className="glass-card rounded-2xl p-8 md:p-12 relative overflow-hidden flex flex-col justify-center min-h-[350px]"
                style={{boxShadow:'0 0 40px rgba(0,212,255,0.05)'}}>
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#00D4FF]/30 rounded-tl-2xl" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#00D4FF]/30 rounded-br-2xl" />
                {featuresData.map((feature,idx)=>{
                  const ActiveIcon = feature.icon;
                  return (
                    <div key={idx}
                      className={`absolute inset-0 p-8 md:p-12 flex flex-col justify-center transition-all duration-500 ease-in-out ${activeFeature===idx?'opacity-100 translate-x-0 pointer-events-auto z-10':'opacity-0 translate-x-12 pointer-events-none z-0'}`}>
                      <div className="flex items-center gap-6 mb-6">
                        <div className="w-16 h-16 bg-[#0A0F1C] border border-[#00D4FF] rounded-xl flex items-center justify-center text-[#00D4FF]"
                          style={{boxShadow:'0 0 20px rgba(0,212,255,0.2)'}}>
                          <ActiveIcon />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-[#E6EDF3]">{feature.title}</h3>
                      </div>
                      <p className="text-[#7B8794] text-lg leading-relaxed mb-8 max-w-2xl">{feature.description}</p>
                      <div className="mt-auto pt-6 border-t border-[#1F2A36]">
                        <div className="inline-flex items-center gap-3 bg-[#0A0F1C] px-4 py-2 rounded-lg border border-[#1F2A36]">
                          <span className="w-2 h-2 rounded-full bg-[#00FFA3] animate-pulse" />
                          <span className="text-[#7B8794] text-sm" style={{fontFamily:"'Share Tech Mono',monospace"}}>Stack:</span>
                          <span className="text-[#00FFA3] text-sm font-semibold" style={{fontFamily:"'Share Tech Mono',monospace"}}>{feature.tech}</span>
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

      {/* ─────────────────── FOOTER ─────────────────── */}
      <footer className="bg-[#0A0F1C] py-12 border-t border-[#1F2A36]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-[#7B8794]">
            <div className="text-[#00D4FF] opacity-80"><Icons.Shield /></div>
            <div className="flex flex-col">
              <span className="font-bold tracking-wider text-[#E6EDF3]">CRIME<span className="text-[#00D4FF]">LENS</span></span>
              <span className="text-xs">© {new Date().getFullYear()} Advanced Forensic Systems.</span>
            </div>
          </div>
          <div className="flex gap-8 text-sm text-[#7B8794] font-medium">
            {['Privacy Protocol','Terms of Service','API Documentation'].map(link=>(
              <a key={link} href="#" className="hover:text-[#00D4FF] transition-colors">{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}