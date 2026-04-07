import React from 'react'
import useWellStore from '../store/wellStore'

function fmt(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-geo-panel border border-geo-border rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || '#e2e8f0' }}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function ZoneBadge({ label }) {
  const colors = {
    productive:       { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#10b981' },
    marginal:         { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  text: '#f59e0b' },
    'non-productive': { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   text: '#ef4444' },
  }
  const c = colors[label] || { bg: '#1f2937', border: '#374151', text: '#94a3b8' }
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {label.replace('-', ' ')}
    </span>
  )
}

function RunCard({ entry, onLoad, onDelete }) {
  const dominantZone = (() => {
    if (!entry.predictions) return null
    const c = { productive: 0, marginal: 0, 'non-productive': 0 }
    entry.predictions.zone_label.forEach((z) => { if (c[z] !== undefined) c[z]++ })
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]
  })()

  return (
    <div className="bg-geo-panel border border-geo-border rounded-xl p-4 hover:border-geo-accent/40 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs text-slate-400">{fmt(entry.timestamp)}</span>
            {dominantZone && <ZoneBadge label={dominantZone} />}
            {entry.modelBackend && (
              <span className="px-2 py-0.5 rounded text-xs bg-geo-dark border border-geo-border text-slate-500">
                {entry.modelBackend}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div>
              <p className="text-xs text-slate-500">Depth Range</p>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">
                {entry.depthMin?.toFixed(0)}–{entry.depthMax?.toFixed(0)} m
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Samples</p>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">
                {entry.samples?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Productive %</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: '#10b981' }}>
                {entry.productivePct?.toFixed(1)}%
              </p>
            </div>
            {entry.fitnessScore != null && (
              <div>
                <p className="text-xs text-slate-500">Fitness Score</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: '#06b6d4' }}>
                  {entry.fitnessScore.toFixed(4)}
                </p>
              </div>
            )}
            {entry.productiveExposure != null && (
              <div>
                <p className="text-xs text-slate-500">Zone Exposure</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: '#4ade80' }}>
                  {(entry.productiveExposure * 100).toFixed(1)}%
                </p>
              </div>
            )}
            {entry.maxDLS != null && (
              <div>
                <p className="text-xs text-slate-500">Max DLS</p>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">
                  {entry.maxDLS.toFixed(2)} °/30m
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onLoad(entry)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-geo-accent/20 border border-geo-accent/40 text-geo-accent hover:bg-geo-accent/30 transition-colors whitespace-nowrap"
          >
            Load Run
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-geo-dark border border-geo-border text-slate-500 hover:text-geo-red hover:border-geo-red/40 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { runHistory, loadFromHistory, deleteHistoryEntry, clearHistory, setView, reset } = useWellStore()

  const stats = React.useMemo(() => {
    if (!runHistory.length) return null
    const withFitness = runHistory.filter((r) => r.fitnessScore != null)
    const withExposure = runHistory.filter((r) => r.productiveExposure != null)
    return {
      total: runHistory.length,
      bestFitness: withFitness.length ? Math.max(...withFitness.map((r) => r.fitnessScore)) : null,
      avgExposure: withExposure.length
        ? withExposure.reduce((s, r) => s + r.productiveExposure, 0) / withExposure.length
        : null,
      avgProductivePct: runHistory.reduce((s, r) => s + (r.productivePct || 0), 0) / runHistory.length,
    }
  }, [runHistory])

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Run Dashboard</h2>
          <p className="text-sm text-slate-400 mt-0.5">History of all optimization runs — stored locally in your browser</p>
        </div>
        <div className="flex items-center gap-3">
          {runHistory.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Clear all run history?')) clearHistory() }}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-geo-border text-slate-500 hover:text-geo-red hover:border-geo-red/40 transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => { reset(); setView('workflow') }}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-geo-accent/20 border border-geo-accent/40 text-geo-accent hover:bg-geo-accent/30 transition-colors"
          >
            + New Run
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Runs"
            value={stats.total}
            sub="stored locally"
            color="#06b6d4"
          />
          <StatCard
            label="Best Fitness"
            value={stats.bestFitness != null ? stats.bestFitness.toFixed(4) : '—'}
            sub="across all runs"
            color="#10b981"
          />
          <StatCard
            label="Avg Zone Exposure"
            value={stats.avgExposure != null ? `${(stats.avgExposure * 100).toFixed(1)}%` : '—'}
            sub="productive zone"
            color="#f59e0b"
          />
          <StatCard
            label="Avg Productive"
            value={`${stats.avgProductivePct.toFixed(1)}%`}
            sub="of intervals"
            color="#c084fc"
          />
        </div>
      )}

      {/* Run list */}
      {runHistory.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-geo-border/40 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5">
              <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400">No runs yet</p>
            <p className="text-xs text-slate-600 mt-1">Complete a full workflow (upload → predict → optimize) and it will appear here.</p>
          </div>
          <button
            onClick={() => { reset(); setView('workflow') }}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-geo-accent/20 border border-geo-accent/40 text-geo-accent hover:bg-geo-accent/30 transition-colors"
          >
            Start First Run
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 uppercase tracking-widest">
            {runHistory.length} run{runHistory.length !== 1 ? 's' : ''} — most recent first
          </p>
          {runHistory.map((entry) => (
            <RunCard
              key={entry.id}
              entry={entry}
              onLoad={loadFromHistory}
              onDelete={deleteHistoryEntry}
            />
          ))}
        </div>
      )}
    </div>
  )
}
