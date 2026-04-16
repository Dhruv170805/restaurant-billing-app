'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * NEXUS COMMAND Identity Plane.
 * Glassmorphic, High-Fidelity Executive Authentication.
 * Communicates with the NestJS Auth Engine at Port 4000.
 */
export default function HQLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // POST directly to the proxied HQ Auth endpoint
      // Next.js rewrites /hq/api/superadmin/* to localhost:4000/api/superadmin/*
      const res = await fetch('/hq/api/superadmin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(totpRequired ? { totp } : {}) }),
      });

      const data = await res.json();

      if (res.status === 401 && data.totpRequired) {
        setTotpRequired(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.message || 'Access Denied: Check credentials.');
        setLoading(false);
        return;
      }

      // Deployment success: Redirection to command analytics
      router.push('/hq');
      router.refresh();
    } catch (err) {
      setError('HQ API Link Failure: Check backend status.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] relative overflow-hidden font-sans selection:bg-sky-500/30">
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      </div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[32px] p-10 shadow-2xl relative overflow-hidden group">
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <div className="text-center mb-10 relative">
            <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-sky-500/20 shadow-inner">
              <span className="text-2xl">🛡️</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2">
              NEXUS <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">COMMAND</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium tracking-wide">EXECUTIVE IDENTITY GATEWAY</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {!totpRequired ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Executive Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all placeholder:text-slate-600"
                    placeholder="admin@nexus.io"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Secure Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all placeholder:text-slate-600"
                    placeholder="••••••••••••"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-2xl mb-2 text-center">
                  <p className="text-sky-400 text-xs font-bold uppercase tracking-widest">🔐 Multi-Factor Authentication</p>
                  <p className="text-sky-400/60 text-[10px] mt-1 italic">Enter the 6-digit code from your authenticator app</p>
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900/50 border-2 border-sky-500/30 rounded-2xl p-6 text-white text-4xl text-center font-mono tracking-[0.4em] focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-800"
                  placeholder="000000"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-xs text-center font-bold">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-sky-500/20 transform active:scale-[0.98] mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                  VERIFYING...
                </span>
              ) : (
                totpRequired ? 'AUTHORIZE HQ ACCESS' : 'INITIALIZE COMMAND BRIDGE'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-slate-600">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">GOD-MODE PLATFORM GOVERNANCE</p>
          </div>
        </div>
      </div>
    </div>
  );
}
