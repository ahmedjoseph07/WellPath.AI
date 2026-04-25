import useWellStore from '../../store/wellStore'

export default function Header() {
  const { view, setView, reset, runHistory } = useWellStore()

  const goHome = () => {
    setView('workflow')
    reset()
  }

  return (
    <header className="bg-geo-panel border-b border-geo-border px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={goHome}
          title="Go home — start a new run"
          className="flex items-center gap-2 group rounded-lg -ml-1 px-1 py-0.5 transition-colors hover:bg-geo-accent-soft focus:outline-none focus:ring-2 focus:ring-geo-accent/40"
        >
          <div className="w-8 h-8 rounded-lg bg-geo-accent-soft border border-geo-accent-bd flex items-center justify-center transition-colors group-hover:bg-geo-accent group-hover:border-geo-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2"
                 className="stroke-geo-accent group-hover:stroke-white transition-colors">
              <path d="M12 2L12 22M12 2C12 2 7 6 7 12M12 2C12 2 17 6 17 12" />
              <circle cx="12" cy="22" r="2" className="fill-geo-accent group-hover:fill-white transition-colors" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-geo-accent">WellPath</span>
            <span className="text-geo-ink">.AI</span>
          </h1>
        </button>
        <div className="h-6 w-px bg-geo-border" />
        <p className="text-sm text-geo-muted font-medium hidden sm:block">AI-Assisted Well Path Optimization — Geosteering & Well Log Data</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Dashboard toggle */}
        <button
          onClick={() => setView(view === 'dashboard' ? 'workflow' : 'dashboard')}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
            ${view === 'dashboard'
              ? 'bg-geo-accent-soft border-geo-accent text-geo-accent'
              : 'bg-geo-panel border-geo-border text-geo-muted hover:text-geo-ink hover:border-geo-accent/50'
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
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-geo-accent text-white leading-none">
              {runHistory.length}
            </span>
          )}
        </button>

        {/* New Run */}
        {view === 'workflow' && (
          <button
            onClick={() => { reset() }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-geo-border bg-geo-panel text-geo-muted hover:text-geo-ink hover:border-geo-accent/50 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Run
          </button>
        )}

        <div className="h-5 w-px bg-geo-border mx-1" />

        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-geo-accent-soft border border-geo-accent-bd text-geo-accent tracking-wider uppercase">
          Joseph Ahmed
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-geo-green/10 border border-geo-green/30 text-geo-green">
          Beta
        </span>
      </div>
    </header>
  )
}
