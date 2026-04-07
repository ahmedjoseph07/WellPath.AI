import { Suspense, useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Grid, Html } from '@react-three/drei'
import FormationLayers from './FormationLayers'
import WellTrajectory from './WellTrajectory'
import VerticalWell from './VerticalWell'
import useWellStore from '../../store/wellStore'

// ── Lighting ─────────────────────────────────────────────────────────────────
function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[500, 500, 500]} intensity={1.2} castShadow />
      <directionalLight position={[-300, -800, -300]} intensity={0.35} color="#06b6d4" />
      <pointLight position={[0, -500, 0]} intensity={0.4} color="#10b981" />
    </>
  )
}

// ── Surface drilling rig ──────────────────────────────────────────────────────
function SurfaceRig() {
  return (
    <group position={[0, 8, 0]}>
      {/* Platform deck */}
      <mesh>
        <boxGeometry args={[60, 6, 60]} />
        <meshPhongMaterial color="#1e293b" shininess={25} />
      </mesh>
      {/* Platform edge trim */}
      <mesh>
        <boxGeometry args={[62, 1, 62]} />
        <meshBasicMaterial color="#334155" />
      </mesh>
      {/* 4 platform legs */}
      {[[-22, 0, -22], [22, 0, -22], [-22, 0, 22], [22, 0, 22]].map(([x, , z], i) => (
        <mesh key={i} position={[x, -16, z]}>
          <cylinderGeometry args={[2, 2.5, 26, 8]} />
          <meshPhongMaterial color="#0f172a" />
        </mesh>
      ))}
      {/* Derrick tower */}
      <mesh position={[0, 46, 0]}>
        <cylinderGeometry args={[1, 4, 80, 8]} />
        <meshPhongMaterial color="#334155" shininess={40} />
      </mesh>
      {/* Cross bracing (decorative boxes) */}
      {[20, 40, 60].map((h) => (
        <mesh key={h} position={[0, h, 0]}>
          <boxGeometry args={[14, 1, 2]} />
          <meshBasicMaterial color="#374151" />
        </mesh>
      ))}
      {/* Crown block */}
      <mesh position={[0, 89, 0]}>
        <boxGeometry args={[14, 8, 14]} />
        <meshPhongMaterial color="#475569" shininess={60} />
      </mesh>
      {/* Mast above crown */}
      <mesh position={[0, 100, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 18, 6]} />
        <meshPhongMaterial color="#64748b" />
      </mesh>
      {/* Wellhead flange at ground */}
      <mesh position={[0, -7, 0]}>
        <cylinderGeometry args={[6, 7, 10, 12]} />
        <meshPhongMaterial color="#475569" shininess={70} />
      </mesh>
      {/* BOP stack */}
      <mesh position={[0, -14, 0]}>
        <boxGeometry args={[12, 10, 12]} />
        <meshPhongMaterial color="#1e293b" shininess={30} />
      </mesh>
      {/* Rig label */}
      <Html position={[38, 30, 0]} distanceFactor={400} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(17,24,39,0.85)',
          border: '1px solid #06b6d440',
          borderRadius: 5,
          padding: '3px 7px',
          whiteSpace: 'nowrap',
          color: '#06b6d4',
          fontSize: 10,
          fontWeight: 600,
        }}>
          ⛽ Surface Location
        </div>
      </Html>
    </group>
  )
}

// ── Depth axis with Html labels ────────────────────────────────────────────────
function DepthAxis({ maxDepth }) {
  const step = maxDepth <= 1500 ? 200 : maxDepth <= 3000 ? 500 : 1000
  const ticks = useMemo(() => {
    const t = []
    for (let d = 0; d <= maxDepth; d += step) t.push(d)
    return t
  }, [maxDepth, step])

  return (
    <group>
      {/* Vertical axis line */}
      <mesh position={[240, -(maxDepth / 2), 0]}>
        <cylinderGeometry args={[0.4, 0.4, maxDepth, 4]} />
        <meshBasicMaterial color="#374151" />
      </mesh>
      {ticks.map((depth) => (
        <group key={depth} position={[240, -depth, 0]}>
          <mesh>
            <boxGeometry args={[14, 1.2, 1.2]} />
            <meshBasicMaterial color={depth === 0 ? '#6b7280' : '#374151'} />
          </mesh>
          <Html position={[18, 0, 0]} distanceFactor={350} style={{ pointerEvents: 'none', userSelect: 'none' }}>
            <span style={{ color: '#4b5563', fontSize: 10, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {depth} m
            </span>
          </Html>
        </group>
      ))}
      {/* "TVD" label at top */}
      <Html position={[240, 30, 0]} distanceFactor={350} style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#374151', fontSize: 9, whiteSpace: 'nowrap', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>
          TVD ↓
        </span>
      </Html>
    </group>
  )
}

// ── North compass on the surface grid ─────────────────────────────────────────
function CompassRose() {
  return (
    <group position={[0, 2, 0]}>
      {/* N line */}
      <mesh position={[0, 0, -160]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 300, 4]} />
        <meshBasicMaterial color="#374151" />
      </mesh>
      {/* E line */}
      <mesh position={[160, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 300, 4]} />
        <meshBasicMaterial color="#374151" />
      </mesh>
      {/* N label */}
      <Html position={[0, 0, -320]} distanceFactor={400} style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>N</span>
      </Html>
      {/* E label */}
      <Html position={[330, 0, 0]} distanceFactor={400} style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>E</span>
      </Html>
    </group>
  )
}

// ── Overlay: legend ────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: '#10b981', label: 'Productive Zone' },
    { color: '#f59e0b', label: 'Marginal Zone' },
    { color: '#ef4444', label: 'Non-Productive' },
    { color: '#06b6d4', label: 'Optimized Path' },
    { color: '#f59e0b', label: 'Kick-off Point', shape: 'circle' },
    { color: '#94a3b8', label: 'Vertical Reference' },
  ]
  return (
    <div className="absolute bottom-4 left-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Legend</p>
      <div className="flex flex-col gap-1.5">
        {items.map(({ color, label, shape }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-3 h-3 flex-shrink-0 ${shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`}
              style={{ background: color }}
            />
            <span className="text-xs text-slate-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Overlay: results panel ─────────────────────────────────────────────────────
function SceneStats({ trajectory }) {
  if (!trajectory) return null
  const pts = trajectory.trajectory ?? []
  const maxInc = pts.length ? Math.max(...pts.map((p) => p.inclination ?? 0)) : null
  const departure = pts.length
    ? Math.sqrt((pts[pts.length - 1].x ?? 0) ** 2 + (pts[pts.length - 1].y ?? 0) ** 2)
    : null

  return (
    <div className="absolute top-4 right-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm min-w-44">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Optimization Results</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between gap-4">
          <span className="text-xs text-slate-500">Fitness Score</span>
          <span className="text-xs font-bold text-geo-accent">{trajectory.fitness_score?.toFixed(4) ?? 'N/A'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-slate-500">Zone Exposure</span>
          <span className="text-xs font-bold text-geo-green">
            {trajectory.productive_zone_exposure != null
              ? `${(trajectory.productive_zone_exposure * 100).toFixed(1)}%` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-slate-500">Max DLS</span>
          <span className="text-xs font-bold text-geo-yellow">
            {trajectory.max_dogleg_severity != null
              ? `${trajectory.max_dogleg_severity.toFixed(2)} °/30m` : 'N/A'}
          </span>
        </div>
        {maxInc != null && (
          <div className="flex justify-between gap-4">
            <span className="text-xs text-slate-500">Max Inclination</span>
            <span className="text-xs font-bold text-slate-200">{maxInc.toFixed(1)}°</span>
          </div>
        )}
        {departure != null && (
          <div className="flex justify-between gap-4">
            <span className="text-xs text-slate-500">Lateral Departure</span>
            <span className="text-xs font-bold text-slate-200">{departure.toFixed(0)} m</span>
          </div>
        )}
        {pts.length > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-xs text-slate-500">Survey Stations</span>
            <span className="text-xs font-bold text-slate-200">{pts.length}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Overlay: GA convergence sparkline ─────────────────────────────────────────
function ConvergenceChart({ history }) {
  if (!history?.length) return null
  const W = 180, H = 56
  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1

  const polyline = history.map((v, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const lastY = H - ((history[history.length - 1] - min) / range) * (H - 4) - 2
  const improvement = max > min
    ? `+${(((max - history[0]) / (Math.abs(history[0]) || 1)) * 100).toFixed(1)}%`
    : 'flat'

  return (
    <div className="absolute bottom-4 right-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GA Convergence</p>
        <span className="text-xs font-bold text-geo-green">{improvement}</span>
      </div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        {/* Fill area under curve */}
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${H} ${polyline} ${W},${H}`}
          fill="url(#sparkGrad)"
        />
        <polyline points={polyline} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Start dot */}
        <circle cx="0" cy={H - ((history[0] - min) / range) * (H - 4) - 2} r="2.5" fill="#94a3b8" />
        {/* End dot */}
        <circle cx={W} cy={lastY} r="3.5" fill="#10b981" />
      </svg>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-slate-600">Gen 1</span>
        <span className="text-xs text-slate-500">{history.length} generations</span>
        <span className="text-xs text-geo-green font-semibold">{history[history.length - 1]?.toFixed(4)}</span>
      </div>
    </div>
  )
}

// ── Overlay: controls hint ─────────────────────────────────────────────────────
function Controls3D({ showLabels, onToggleLabels }) {
  return (
    <div className="absolute top-4 left-4 bg-geo-panel/92 border border-geo-border rounded-xl p-2.5 backdrop-blur-sm">
      <p className="text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">3D Controls</p>
      <div className="flex flex-col gap-1 text-xs text-slate-500 mb-2.5">
        <span>Left drag: Rotate</span>
        <span>Right drag: Pan</span>
        <span>Scroll: Zoom</span>
      </div>
      <button
        onClick={onToggleLabels}
        className={`w-full text-xs px-2 py-1 rounded border transition-colors ${
          showLabels
            ? 'bg-geo-accent/20 border-geo-accent/40 text-geo-accent'
            : 'bg-geo-dark border-geo-border text-slate-500 hover:text-slate-300'
        }`}
      >
        {showLabels ? '✓' : ''} Zone Labels
      </button>
    </div>
  )
}

// ── Main Scene ─────────────────────────────────────────────────────────────────
export default function Scene3D() {
  const { trajectory, wellLog } = useWellStore()
  const [showLabels, setShowLabels] = useState(true)

  const maxDepth = useMemo(() => {
    if (trajectory?.trajectory) return Math.max(...trajectory.trajectory.map((p) => p.z ?? p.depth ?? 0))
    if (wellLog?.depths)         return Math.max(...wellLog.depths)
    return 3000
  }, [trajectory, wellLog])

  return (
    <div className="relative w-full bg-geo-dark rounded-xl border border-geo-border overflow-hidden" style={{ minHeight: 620, height: '100%' }}>
      <Suspense fallback={
        <div className="flex items-center justify-center w-full h-full min-h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-geo-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading 3D scene...</p>
          </div>
        </div>
      }>
        <Canvas
          camera={{
            position: [520, -(maxDepth * 0.25), 700],
            fov: 48,
            near: 1,
            far: 25000,
            up: [0, 1, 0],
          }}
          style={{ background: '#060a14' }}
        >
          <SceneLights />

          <Stars radius={6000} depth={60} count={2500} factor={4} saturation={0.1} fade speed={0.15} />

          <Grid
            position={[0, 2, 0]}
            args={[900, 900]}
            cellSize={50}
            cellThickness={0.25}
            cellColor="#111827"
            sectionSize={200}
            sectionThickness={0.7}
            sectionColor="#1f2937"
            fadeDistance={2500}
            fadeStrength={1.2}
          />

          <SurfaceRig />
          <CompassRose />
          <FormationLayers showLabels={showLabels} />
          <VerticalWell depthTop={0} depthBottom={maxDepth} />
          <DepthAxis maxDepth={maxDepth} />
          {trajectory && <WellTrajectory />}

          <OrbitControls
            target={[0, -(maxDepth * 0.35), 0]}
            enableDamping
            dampingFactor={0.07}
            minDistance={100}
            maxDistance={8000}
          />
        </Canvas>
      </Suspense>

      {/* HUD overlays */}
      <Legend />
      <SceneStats trajectory={trajectory} />
      <Controls3D showLabels={showLabels} onToggleLabels={() => setShowLabels((v) => !v)} />

      {/* GA convergence — only shown after optimization, replaces results in bottom-right */}
      {trajectory?.generation_history?.length > 0 && (
        <ConvergenceChart history={trajectory.generation_history} />
      )}

      {/* Pre-optimization prompt */}
      {!trajectory && (
        <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none">
          <div className="bg-geo-panel/85 border border-geo-border rounded-xl px-6 py-3 backdrop-blur-sm text-center">
            <p className="text-sm text-slate-300 font-medium">Run GA Optimization to see the optimized trajectory</p>
            <p className="text-xs text-slate-500 mt-1">Formation layers · Waypoints · Kick-off marker · Depth labels</p>
          </div>
        </div>
      )}
    </div>
  )
}
