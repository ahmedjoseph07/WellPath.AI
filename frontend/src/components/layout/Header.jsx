import useWellStore from '../../store/wellStore'

export default function Header() {
  const { view, setView, reset, runHistory } = useWellStore()

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
        <p className="text-sm text-slate-400 font-medium hidden sm:block">AI-Assisted Well Path Optimization</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Dashboard toggle */}
        <button
          onClick={() => setView(view === 'dashboard' ? 'workflow' : 'dashboard')}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
            ${view === 'dashboard'
              ? 'bg-geo-accent/20 border-geo-accent/40 text-geo-accent'
              : 'bg-geo-dark border-geo-border text-slate-400 hover:text-slate-200 hover:border-geo-border/80'
            }
          `}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          Dashboard
          {runHistory.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-geo-accent/30 text-geo-accent leading-none">
              {runHistory.length}
            </span>
          )}
        </button>

        {/* New Run */}
        {view === 'workflow' && (
          <button
            onClick={() => { reset() }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-geo-border bg-geo-dark text-slate-400 hover:text-slate-200 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Run
          </button>
        )}

        <div className="h-5 w-px bg-geo-border mx-1" />

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
