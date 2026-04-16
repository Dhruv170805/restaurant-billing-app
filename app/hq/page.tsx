'use client';

import React, { useEffect, useState } from 'react';
import { PLATFORM_THEME } from '@/lib/constants/theme';
import { PLATFORM_CONFIG } from '@/lib/constants/platform';

/**
 * NEXUS COMMAND: Global Platform Dashboard.
 * provides a cinematic, real-time overview of the entire SaaS fleet's performance.
 */
export default function HQDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/hq/api/superadmin/analytics')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="p-10 text-slate-500 animate-pulse font-mono text-xs">
      {`> INITIALIZING COMMAND PLANE...`}
    </div>
  );

  const stats = [
    { label: '30D Revenue', value: `₹ ${parseFloat(data.revenue30d).toLocaleString()}`, color: PLATFORM_THEME.brand.success },
    { label: 'Total Tenants', value: data.tenants.reduce((sum: number, t: any) => sum + parseInt(t.count), 0), color: PLATFORM_THEME.brand.hq },
    { label: 'Database Sync', value: data.dbSize, color: PLATFORM_THEME.brand.warning },
    { label: 'Platform Health', value: '100%', color: PLATFORM_THEME.brand.info },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700 p-6 rounded-3xl backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">{stat.label}</p>
            <p className="text-3xl font-black tracking-tighter" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tier Distribution */}
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-3xl lg:col-span-1">
          <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
            🏢 Tenant Distribution
          </h3>
          <div className="space-y-4">
            {data.tenants.map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-slate-400 text-xs uppercase font-bold">{t.plan}</span>
                <div className="flex-1 mx-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-sky-500" 
                    style={{ width: `${(t.count / data.tenants.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-black">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Velocity */}
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-3xl lg:col-span-2">
          <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
            🚀 Global Order Velocity (Last 7 Days)
          </h3>
          <div className="h-48 flex items-end gap-2">
            {data.velocity.map((v: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-indigo-500/50 border border-indigo-400/30 rounded-t-lg transition-all hover:bg-indigo-400"
                  style={{ height: `${(v.count / Math.max(...data.velocity.map((x: any) => x.count))) * 100}%` }}
                />
                <span className="text-[8px] text-slate-500 font-bold uppercase">{new Date(v.date).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global Control Terminal (Simulated) */}
      <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Command Terminal</h3>
        <div className="font-mono text-xs text-green-400 space-y-1">
          <p>{`> Initializing global fleet monitoring...`}</p>
          <p>{`> [SUCCESS] Authenticated on HQ Subdomain.`}</p>
          <p>{`> [INFO] Scanned ${data.tenants.length} tenants across 3 geographical zones.`}</p>
          <p>{`> [WARN] 2 unpaid invoices detected in GRACE_PERIOD.`}</p>
          <p className="animate-pulse">{`> Monitoring incoming orders...`}</p>
        </div>
      </div>
    </div>
  );
}
