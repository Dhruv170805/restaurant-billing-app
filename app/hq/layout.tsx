import React from 'react';
import { getSuperAdminSession } from '@/lib/next_auth_utils';
import { redirect } from 'next/navigation';

export default async function HQLayout({ children }: { children: React.ReactNode }) {
  const session = await getSuperAdminSession();

  // Middleware handles redirection, but this is an extra safety layer
  if (!session) {
    redirect('/hq/login');
    return null; // Ensure TS knows execution stops here
  }

  const primaryColor = '#0ea5e9'; // HQ Brand: Sky Blue

  return (
    <div className="hq-layout flex min-h-screen bg-slate-900 text-slate-200 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black tracking-tighter" style={{ color: primaryColor }}>
            NEXUS COMMAND
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Platform Control Plane</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <a href="/hq" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors">
             📊 Analytics
          </a>
          <a href="/hq/tenants" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors">
             🏢 Tenants
          </a>
          <a href="/hq/subscriptions" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors">
             💳 Billing & Plans
          </a>
          <a href="/hq/payments" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors">
             💸 UPI Verification
          </a>
          <a href="/hq/logs" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors">
             📜 Audit Logs
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center font-bold text-white uppercase">
              {(session as any).name?.[0] || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate">{(session as any).name}</p>
              <p className="text-[10px] text-slate-500 truncate">{(session as any).role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
