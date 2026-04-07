import React from 'react'

export default function Header() {
  return (
    <header className="bg-geo-panel border-b border-geo-border px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-geo-accent/20 border border-geo-accent/40 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
              <path d="M12 2L12 22M12 2C12 2 7 6 7 12M12 2C12 2 17 6 17 12" />
              <circle cx="12" cy="22" r="2" fill="#06b6d4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-geo-accent">WellPath</span>
            <span className="text-slate-200">.AI</span>
          </h1>
        </div>
        <div className="h-6 w-px bg-geo-border" />
        <p className="text-sm text-slate-400 font-medium">AI-Assisted Well Path Optimization</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-geo-accent/10 border border-geo-accent/30 text-geo-accent tracking-wider uppercase">
          CUET Thesis 2025
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-geo-green/10 border border-geo-green/30 text-geo-green">
          Beta
        </span>
      </div>
    </header>
  )
}
