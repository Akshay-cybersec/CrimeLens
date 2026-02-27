'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';

function LoginView() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      const role = typeof window !== 'undefined' ? localStorage.getItem('auth_role') : null;
      if (role === 'SUPER_ADMIN') {
        router.push('/admin/approvals');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Invalid credentials or account not approved.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* FORCES THE BODY TO BE DARK - Fixes your white background issue */
        body, html {
          background-color: #020617 !important; /* Deep slate/black */
          margin: 0;
          padding: 0;
          color: white;
        }

        /* Smooth entrance animation */
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Subtle radar/grid background matching the Crimelens theme */
        .bg-crimelens-radar {
          background-color: #050b14;
          background-image: 
            radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
            linear-gradient(rgba(34, 211, 238, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.03) 1px, transparent 1px);
          background-size: 100% 100%, 40px 40px, 40px 40px;
          background-position: center center;
        }
      `}</style>

      {/* Main Full-Screen Container */}
      <main className="relative flex min-h-screen items-center justify-center bg-crimelens-radar p-6 overflow-hidden">
        
        {/* Wrapper for the login card with entrance animation */}
        <div className="relative w-full max-w-md animate-slide-up z-10">
          
          {/* Main Login Card - Dark Glassmorphism */}
          <div className="relative w-full rounded-2xl bg-[#0a101a]/80 backdrop-blur-xl border border-cyan-900/30 p-8 shadow-[0_0_40px_rgba(6,182,212,0.1)] sm:p-10">
            
            <div className="mb-8 text-center">
              {/* Operator Login Pill (Matches the top nav from your screenshot) */}
              <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] text-cyan-400 uppercase rounded-full bg-cyan-950/50 border border-cyan-800/50 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                <span className="w-1.5 h-1.5 mr-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Operator Login
              </div>
              
              {/* Gradient Header Text matching "AI Forensics" and "Criminal Insight" */}
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 pb-1">
                Welcome Back
              </h1>
              <p className="mt-3 text-sm text-slate-400">Authenticate to access the dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-red-950/40 p-3 text-sm text-red-400 border border-red-900/50 flex items-center">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 7.293 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Email Address
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-[#060b14] px-4 py-3.5 text-slate-100 placeholder-slate-600 transition-all duration-300 focus:border-cyan-500 focus:bg-[#0a101a] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  type="email"
                  placeholder="operator@crimelens.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-[#060b14] px-4 py-3.5 text-slate-100 placeholder-slate-600 transition-all duration-300 focus:border-cyan-500 focus:bg-[#0a101a] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Submit Button (Solid Cyan matching the "Start Investigation" button) */}
              <button
                type="submit"
                disabled={loading}
                className="mt-8 flex w-full items-center justify-center rounded-lg bg-cyan-500 px-4 py-4 text-sm font-bold text-[#050b14] transition-all duration-300 hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="mr-2 h-5 w-5 animate-spin text-[#050b14]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  'Authenticate'
                )}
              </button>

              {/* Footer Link */}
              <p className="mt-6 text-center text-sm text-slate-500">
                No account yet?{' '}
                <Link 
                  href="/signup" 
                  className="font-semibold text-cyan-500 transition-all hover:text-cyan-400 hover:underline hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                >
                  Sign up for approval
                </Link>
              </p>
              
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

export default function LoginPage() {
  return <LoginView />;
}