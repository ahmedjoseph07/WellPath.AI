import React from 'react'
import useWellStore from './store/wellStore'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './components/Dashboard'
import DataPreview from './components/upload/DataPreview'
import WellLogChart from './components/charts/WellLogChart'
import ProductivityChart from './components/charts/ProductivityChart'
import Scene3D from './components/visualization/Scene3D'

const STEPS = [
  { id: 1, label: '1. Data Input' },
  { id: 2, label: '2. Preview' },
  { id: 3, label: '3. Predict Zones' },
  { id: 4, label: '4. Optimize & View' },
]

function StepIndicator() {
  const { activeStep, goToStep, wellLog, predictions, trajectory } = useWellStore()

  // A step is reachable if its prerequisite data exists
  const reachable = { 1: true, 2: !!wellLog, 3: !!predictions, 4: !!trajectory }

  return (
    <div className="bg-geo-panel border-b border-geo-border px-6 py-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => {
          const isDone    = step.id < activeStep
          const isActive  = step.id === activeStep
          const canClick  = reachable[step.id] && !isActive
          const state     = isActive ? 'step-active' : isDone ? 'step-done' : 'step-pending'

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => canClick && goToStep(step.id)}
                disabled={!canClick}
                title={canClick ? `Go to ${step.label}` : undefined}
                className={`
                  px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all
                  ${state}
                  ${canClick ? 'cursor-pointer hover:brightness-125' : 'cursor-default'}
                `}
              >
                {isDone && <span className="mr-1.5 text-geo-green">✓</span>}
                <span className={
                  isActive  ? 'text-geo-accent'
                  : isDone  ? 'text-geo-green'
                  : 'text-slate-500'
                }>
                  {step.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-px max-w-12 transition-colors ${
                  step.id < activeStep ? 'bg-geo-green/50' : 'bg-geo-border'
                }`} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

function ErrorBanner() {
  const { error, setError } = useWellStore()
  if (!error) return null

  return (
    <div className="mx-4 mt-3 p-3 rounded-lg bg-geo-red/10 border border-geo-red/30 flex items-start gap-3 flex-shrink-0">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="flex-shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <div className="flex-1">
        <p className="text-xs font-semibold text-geo-red">Error</p>
        <p className="text-xs text-slate-300 mt-0.5 break-all">{error}</p>
      </div>
      <button onClick={() => setError(null)} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function MainPanel() {
  const { activeStep, wellLog } = useWellStore()

  if (activeStep === 1) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="bg-geo-panel border border-geo-border rounded-xl p-6 text-center">
          <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-geo-accent/10 border border-geo-accent/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-200">Load Well Log Data</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Use the sidebar to load synthetic data or upload your own CSV file.
              The data should contain depth, GR, resistivity, density, neutron porosity, and sonic measurements.
            </p>
            <div className="grid grid-cols-3 gap-3 w-full mt-2">
              {['GR (API)', 'Resistivity (Ω·m)', 'Density (g/cc)', 'NP (%)', 'Sonic (μs/ft)', 'Depth (m)'].map((col) => (
                <div key={col} className="bg-geo-dark rounded-lg p-2.5 border border-geo-border text-center">
                  <span className="text-xs text-slate-400 font-medium">{col}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeStep === 2 && wellLog) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <DataPreview />
        <WellLogChart />
      </div>
    )
  }

  if (activeStep === 3) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {/* All 5 log tracks for correlation with zone predictions */}
        <WellLogChart />
        <ProductivityChart />
      </div>
    )
  }

  if (activeStep === 4) {
    return (
      <div className="p-4 flex flex-col" style={{ height: '100%' }}>
        <Scene3D />
      </div>
    )
  }

  return null
}

export default function App() {
  const { view } = useWellStore()

  return (
    <div className="flex flex-col h-screen bg-geo-dark overflow-hidden">
      <Header />

      {view === 'dashboard' ? (
        <div className="flex-1 overflow-hidden">
          <Dashboard />
        </div>
      ) : (
        <>
          <StepIndicator />
          <ErrorBanner />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <MainPanel />
            </main>
          </div>
        </>
      )}
    </div>
  )
}
