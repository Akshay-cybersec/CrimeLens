'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CrimeEvidence {
  label: string;
  count: number;
  evidence: string;
  type: string;
  timestamp: string;
}

const evidenceData: CrimeEvidence[] = [
  { label: 'Jan', count: 420, type: 'Cyber', evidence: 'IP Trace: 192.168.1.1', timestamp: '2026-01-12 04:20:01' },
  { label: 'Feb', count: 210, type: 'Patrol', evidence: 'Unauthorized Entry: Sec-B', timestamp: '2026-02-14 14:32:01' },
  { label: 'Mar', count: 540, type: 'Phishing', evidence: 'Mail-Server Breach', timestamp: '2026-03-21 09:15:44' },
  { label: 'Apr', count: 890, type: 'Fraud', evidence: 'Transaction Loophole', timestamp: '2026-04-05 22:11:10' },
  { label: 'May', count: 450, type: 'Breach', evidence: 'Encrypted File Access', timestamp: '2026-05-18 11:04:22' },
  { label: 'Jun', count: 980, type: 'System', evidence: 'Kernel Exploit Detected', timestamp: '2026-06-30 23:59:59' },
  { label: 'Jul', count: 720, type: 'Network', evidence: 'Packet Sniffing Alert', timestamp: '2026-07-15 16:40:05' },
  { label: 'Aug', count: 850, type: 'Leak', evidence: 'Database Dump Found', timestamp: '2026-08-27 19:18:39' },
];

export default function ForensicTimeline() {
  const [activeStep, setActiveStep] = useState(0);
  const isComplete = activeStep === evidenceData.length - 1;

  const width = 1000;
  const height = 300;
  const paddingX = 100; // Increased padding to prevent edge cut-off
  const paddingY = 60;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < evidenceData.length - 1) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 2500); // Slightly faster for testing
    return () => clearInterval(timer);
  }, []);

  const getX = (index: number) => (index * (width - paddingX * 2)) / (evidenceData.length - 1) + paddingX;
  const getY = (value: number) => height - (value * (height - paddingY * 2)) / 1000 - paddingY;

  const generateProgressivePath = (step: number) => {
    let path = `M ${getX(0)} ${getY(evidenceData[0].count)}`;
    for (let i = 1; i <= step; i++) {
      const prevX = getX(i - 1);
      const prevY = getY(evidenceData[i - 1].count);
      const currX = getX(i);
      const currY = getY(evidenceData[i].count);
      const cp1x = prevX + (currX - prevX) / 2;
      const cp2x = prevX + (currX - prevX) / 2;
      path += ` C ${cp1x} ${prevY}, ${cp2x} ${currY}, ${currX} ${currY}`;
    }
    return path;
  };

  return (
    <div className="w-full max-w-6xl mx-auto font-sans text-black p-10 space-y-12">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] text-red-600 uppercase mb-2">Forensic Report</p>
         
        </div>
        
      </div>

      {/* Visual Timeline Area */}
      <div className="relative h-[450px] border-b border-slate-100"> 
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            d={generateProgressivePath(activeStep)}
            fill="none"
            stroke={isComplete ? "#059669" : "#1d4ed8"}
            strokeWidth="4"
            strokeLinecap="round"
            className="transition-colors duration-1000"
          />

          {evidenceData.map((d, i) => (
            <g key={i}>
              <motion.circle
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: i <= activeStep ? 1 : 0.05, 
                  scale: i <= activeStep ? 1 : 0.5,
                  fill: i === activeStep && !isComplete ? "#ef4444" : "#1d4ed8" 
                }}
                cx={getX(i)}
                cy={getY(d.count)}
                r={i === activeStep ? 8 : 5}
              />
              {i === activeStep && !isComplete && (
                <motion.circle
                  cx={getX(i)}
                  cy={getY(d.count)}
                  initial={{ r: 5, opacity: 0.8 }}
                  animate={{ r: 25, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="fill-red-500"
                />
              )}
            </g>
          ))}
        </svg>

        {/* Floating Box Adjustment Logic */}
        {evidenceData.map((item, i) => (
          <AnimatePresence key={i}>
            {i <= activeStep && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`absolute z-10 bg-white border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 w-44 transition-colors duration-500 ${
                  isComplete ? 'border-emerald-500 shadow-emerald-900/20' : 'border-black'
                }`}
                style={{
                  left: `${(getX(i) / width) * 100}%`,
                  top: i % 2 === 0 ? '0%' : '55%', 
                  // Fix for August (Last Box): Shift it left so it doesn't overflow
                  transform: i === evidenceData.length - 1 ? 'translateX(-90%)' : 'translateX(-50%)'
                }}
              >
                <div className="border-b border-slate-100 pb-1 mb-1.5 flex justify-between items-center text-[9px] font-bold">
                  <span className="text-red-600 uppercase">EVIDENCE_{i + 1}</span>
                  <span className="text-slate-400 font-mono uppercase">{item.label}</span>
                </div>
                <p className="text-base font-mono font-bold text-black leading-none">{item.count}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">{item.type} ALERTS</p>
                <p className="text-[10px] font-medium leading-tight text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-100 italic truncate">
                  "{item.evidence}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Persistent Detailed List (Reveals when complete) */}
      <AnimatePresence>
        {isComplete && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-10"
          >
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold font-mono">FULL_EVIDENCE_LOG</h3>
              <div className="h-px flex-grow bg-slate-200" />
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-200">
                  <tr>
                    <th className="p-4">Ref</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Alert Count</th>
                    <th className="p-4">Forensic Evidence</th>
                    <th className="p-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evidenceData.map((item, idx) => (
                    <motion.tr 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-red-600">EV_{idx + 1}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4 font-mono">{item.count}</td>
                      <td className="p-4 text-slate-600 italic">"{item.evidence}"</td>
                      <td className="p-4 text-right font-mono text-xs text-slate-400">{item.timestamp}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between text-[10px] font-mono text-slate-400 italic">
              <p>END_OF_REPORT</p>
              <p>TOTAL_ALERTS_ACCUMULATED: {evidenceData.reduce((acc, curr) => acc + curr.count, 0)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
