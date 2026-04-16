/**
 * NEXUS DESIGN SYSTEM: High-Fidelity Design Tokens.
 * Centralized authority for branding, palette, and interactive states.
 */

export const PLATFORM_THEME = {
  // Brand Identities
  brand: {
    hq: '#0ea5e9',      // Nexus HQ: Sky Blue
    tenant: '#f37c22',  // POS Default: Orange
    success: '#10b981', // Emerald
    danger: '#ef4444',  // Rose
    warning: '#f59e0b', // Amber
    info: '#6366f1',    // Indigo
  },

  // Color Palette
  slate: {
    950: '#020617',
    900: '#0f172a',
    800: '#1e293b',
    700: '#334155',
    600: '#475569',
    500: '#64748b',
    400: '#94a3b8',
    300: '#cbd5e1',
    200: '#e2e8f0',
    100: '#f1f5f9',
    50: '#f8fafc',
  },

  // Interactive Tokens
  glass: 'backdrop-blur-xl bg-slate-900/50 border border-slate-800',
  glassCard: 'bg-slate-800/50 border border-slate-700 backdrop-blur-sm rounded-3xl',
  
  // Transitions
  smooth: 'transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)',
};
