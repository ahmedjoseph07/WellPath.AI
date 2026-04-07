import { useState } from 'react'
import useWellStore from '../../store/wellStore'
import { getSyntheticData, runPrediction, runOptimization } from '../../api/wellpath'
import UploadZone from '../upload/UploadZone'

function Spinner() {
  return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-geo-border/50">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-semibold text-slate-200">{value}</span>
    </div>
  )
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      Back
    </button>
  )
}

export default function Sidebar() {
  const {
    activeStep, wellLog, predictions, trajectory,
    setWellLog, setPredictions, setTrajectory,
    loading, setLoading, setError, reset, goBack,
  } = useWellStore()

  const [gaConfig, setGaConfig] = useState({ waypoints: 8, generations: 100 })

  async function handleSynthetic() {
    setLoading('upload', true)
    setError(null)
    try {
      const data = await getSyntheticData()
      setWellLog(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading('upload', false)
    }
  }

  async function handlePredict() {
    if (!wellLog) return
    setLoading('predict', true)
    setError(null)
    try {
      const data = await runPrediction(wellLog)
      setPredictions(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading('predict', false)
    }
  }

  async function handleOptimize() {
    if (!predictions) return
    setLoading('optimize', true)
    setError(null)
    try {
      const data = await runOptimization(predictions, gaConfig)
      setTrajectory(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading('optimize', false)
    }
  }

  const depthRange = wellLog
    ? `${Math.min(...wellLog.depths).toFixed(0)} – ${Math.max(...wellLog.depths).toFixed(0)} m`
    : null

  const productiveCount = predictions
    ? predictions.zone_label.filter((z) => z === 'productive').length
    : 0
  const productivePct = predictions
    ? ((productiveCount / predictions.zone_label.length) * 100).toFixed(1)
    : null

  return (
    <aside className="w-80 flex-shrink-0 bg-geo-panel border-r border-geo-border flex flex-col overflow-y-auto">
      <div className="p-4 flex-1 flex flex-col gap-4">

        {/* ── Step 1 ── */}
        {activeStep === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Data Source
              </h3>
              <button
                onClick={handleSynthetic}
                disabled={loading.upload}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-geo-accent/20 border border-geo-accent/40 text-geo-accent font-semibold text-sm hover:bg-geo-accent/30 transition-all disabled:opacity-50 glow-cyan"
              >
                {loading.upload ? <Spinner /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 002-2v-4M17 9l-5 5-5-5M12 12.8V2.5" />
                  </svg>
                )}
                {loading.upload ? 'Loading...' : 'Load Synthetic Data'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-geo-border" />
              <span className="text-xs text-slate-500">or upload CSV</span>
              <div className="flex-1 h-px bg-geo-border" />
            </div>
            <UploadZone />
          </div>
        )}

        {/* ── Step 2 ── */}
        {activeStep === 2 && wellLog && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Well Log Summary
              </h3>
              <BackButton onClick={goBack} />
            </div>
            <div className="bg-geo-dark rounded-lg p-3 border border-geo-border">
              <StatRow label="Depth Range" value={depthRange} />
              <StatRow label="Samples" value={wellLog.depths.length.toLocaleString()} />
              <StatRow label="GR Range" value={`${Math.min(...wellLog.GR).toFixed(1)} – ${Math.max(...wellLog.GR).toFixed(1)} API`} />
              <StatRow label="Resistivity" value={`${Math.min(...wellLog.Resistivity).toFixed(1)} – ${Math.max(...wellLog.Resistivity).toFixed(1)} Ω·m`} />
              {wellLog.Density && (
                <StatRow label="Density" value={`${Math.min(...wellLog.Density).toFixed(2)} – ${Math.max(...wellLog.Density).toFixed(2)} g/cc`} />
              )}
              {wellLog.Sonic && (
                <StatRow label="Sonic" value={`${Math.min(...wellLog.Sonic).toFixed(1)} – ${Math.max(...wellLog.Sonic).toFixed(1)} μs/ft`} />
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                XGBoost Model
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Classifies each depth interval as productive, marginal, or non-productive using GR, resistivity, density, neutron porosity, and sonic logs.
              </p>
              <button
                onClick={handlePredict}
                disabled={loading.predict}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-geo-green/20 border border-geo-green/40 text-geo-green font-semibold text-sm hover:bg-geo-green/30 transition-all disabled:opacity-50 glow-green"
              >
                {loading.predict ? <Spinner /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                  </svg>
                )}
                {loading.predict ? 'Running XGBoost...' : 'Run XGBoost Prediction'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 ── */}
        {activeStep === 3 && predictions && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Prediction Summary
              </h3>
              <BackButton onClick={goBack} />
            </div>

            <div className="bg-geo-dark rounded-lg p-3 border border-geo-border">
              <StatRow label="Total Intervals" value={predictions.depths.length.toLocaleString()} />
              <StatRow label="Productive" value={`${productiveCount} (${productivePct}%)`} />
              <StatRow
                label="Marginal"
                value={predictions.zone_label.filter((z) => z === 'marginal').length}
              />
              <StatRow
                label="Non-Productive"
                value={predictions.zone_label.filter((z) => z === 'non-productive').length}
              />
              {predictions.model_backend && (
                <StatRow label="Model" value={predictions.model_backend} />
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                GA Configuration
              </h3>
              <div className="flex flex-col gap-4 bg-geo-dark rounded-lg p-3 border border-geo-border">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs text-slate-400">Waypoints</label>
                    <span className="text-xs font-bold text-geo-accent">{gaConfig.waypoints}</span>
                  </div>
                  <input
                    type="range" min={4} max={12} value={gaConfig.waypoints}
                    onChange={(e) => setGaConfig((c) => ({ ...c, waypoints: Number(e.target.value) }))}
                    className="w-full h-1.5 rounded-full accent-geo-accent cursor-pointer"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-600">4</span>
                    <span className="text-xs text-slate-600">12</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs text-slate-400">Generations</label>
                    <span className="text-xs font-bold text-geo-accent">{gaConfig.generations}</span>
                  </div>
                  <input
                    type="range" min={50} max={200} step={10} value={gaConfig.generations}
                    onChange={(e) => setGaConfig((c) => ({ ...c, generations: Number(e.target.value) }))}
                    className="w-full h-1.5 rounded-full accent-geo-accent cursor-pointer"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-600">50</span>
                    <span className="text-xs text-slate-600">200</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleOptimize}
              disabled={loading.optimize}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-geo-yellow/20 border border-geo-yellow/40 text-geo-yellow font-semibold text-sm hover:bg-geo-yellow/30 transition-all disabled:opacity-50"
              style={{ boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}
            >
              {loading.optimize ? <Spinner /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                  <path d="M8 12h8M12 8l4 4-4 4" />
                </svg>
              )}
              {loading.optimize ? 'Running GA...' : 'Run GA Optimization'}
            </button>
          </div>
        )}

        {/* ── Step 4 ── */}
        {activeStep === 4 && trajectory && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Optimization Results
              </h3>
              <BackButton onClick={goBack} />
            </div>

            <div className="bg-geo-dark rounded-lg p-3 border border-geo-border">
              <StatRow
                label="Fitness Score"
                value={trajectory.fitness_score != null ? trajectory.fitness_score.toFixed(4) : 'N/A'}
              />
              <StatRow
                label="Productive Exposure"
                value={trajectory.productive_zone_exposure != null
                  ? `${(trajectory.productive_zone_exposure * 100).toFixed(1)}%`
                  : 'N/A'}
              />
              <StatRow
                label="Max DLS"
                value={trajectory.max_dogleg_severity != null
                  ? `${trajectory.max_dogleg_severity.toFixed(2)} °/30m`
                  : 'N/A'}
              />
              <StatRow
                label="Trajectory Points"
                value={trajectory.trajectory ? trajectory.trajectory.length : 'N/A'}
              />
            </div>

            {trajectory.generation_history?.length > 0 && (
              <div className="bg-geo-dark rounded-lg p-3 border border-geo-border">
                <p className="text-xs text-slate-400 mb-1">GA Convergence</p>
                <p className="text-xs text-slate-500">
                  Converged in {trajectory.generation_history.length} generations
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-geo-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-geo-accent transition-all"
                    style={{ width: `${Math.min(100, (trajectory.fitness_score || 0) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-700/50 border border-geo-border text-slate-300 font-semibold text-sm hover:bg-slate-700 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Start New Run
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
