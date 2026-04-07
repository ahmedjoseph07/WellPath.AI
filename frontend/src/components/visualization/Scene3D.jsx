import { Suspense, useState, useMemo, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Grid, Html } from '@react-three/drei'
import FormationLayers from './FormationLayers'
import WellTrajectory from './WellTrajectory'
import VerticalWell from './VerticalWell'
import useWellStore from '../../store/wellStore'

// ── Lighting ──────────────────────────────────────────────────────────────────
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

// ── Camera controller: reacts to preset changes ────────────────────────────────
function CameraController({ preset, maxDepth, orbitRef }) {
  const { camera } = useThree()

  useEffect(() => {
    const halfDepth = maxDepth * 0.5
    const tgt = [0, -halfDepth, 0]

    const positions = {
      perspective: [520,  -(maxDepth * 0.25),  700],
      top:         [0,     100,                  10],
      front:       [0,    -halfDepth,            maxDepth * 0.95],
      side:        [maxDepth * 0.95, -halfDepth,  0],
    }

    const pos = positions[preset] ?? positions.perspective
    camera.position.set(...pos)

    if (orbitRef.current) {
      orbitRef.current.target.set(...tgt)
      orbitRef.current.update()
    }
  }, [preset, maxDepth, camera, orbitRef])

  return null
}

// ── Surface drilling rig ──────────────────────────────────────────────────────
function SurfaceRig() {
  return (
    <group position={[0, 8, 0]}>
      <mesh>
        <boxGeometry args={[60, 6, 60]} />
        <meshPhongMaterial color="#1e293b" shininess={25} />
      </mesh>
      <mesh>
        <boxGeometry args={[62, 1, 62]} />
        <meshBasicMaterial color="#334155" />
      </mesh>
      {[[-22, 0, -22], [22, 0, -22], [-22, 0, 22], [22, 0, 22]].map(([x, , z], i) => (
        <mesh key={i} position={[x, -16, z]}>
          <cylinderGeometry args={[2, 2.5, 26, 8]} />
          <meshPhongMaterial color="#0f172a" />
        </mesh>
      ))}
      <mesh position={[0, 46, 0]}>
        <cylinderGeometry args={[1, 4, 80, 8]} />
        <meshPhongMaterial color="#334155" shininess={40} />
      </mesh>
      {[20, 40, 60].map((h) => (
        <mesh key={h} position={[0, h, 0]}>
          <boxGeometry args={[14, 1, 2]} />
          <meshBasicMaterial color="#374151" />
        </mesh>
      ))}
      <mesh position={[0, 89, 0]}>
        <boxGeometry args={[14, 8, 14]} />
        <meshPhongMaterial color="#475569" shininess={60} />
      </mesh>
      <mesh position={[0, 100, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 18, 6]} />
        <meshPhongMaterial color="#64748b" />
      </mesh>
      <mesh position={[0, -7, 0]}>
        <cylinderGeometry args={[6, 7, 10, 12]} />
        <meshPhongMaterial color="#475569" shininess={70} />
      </mesh>
      <mesh position={[0, -14, 0]}>
        <boxGeometry args={[12, 10, 12]} />
        <meshPhongMaterial color="#1e293b" shininess={30} />
      </mesh>
      <Html position={[38, 30, 0]} distanceFactor={400} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(17,24,39,0.85)', border: '1px solid #06b6d440',
          borderRadius: 5, padding: '3px 7px', whiteSpace: 'nowrap',
          color: '#06b6d4', fontSize: 10, fontWeight: 600,
        }}>⛽ Surface Location</div>
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
      <Html position={[240, 30, 0]} distanceFactor={350} style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#374151', fontSize: 9, whiteSpace: 'nowrap', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>
          TVD ↓
        </span>
      </Html>
    </group>
  )
}

// ── Compass rose ───────────────────────────────────────────────────────────────
function CompassRose() {
  return (
    <group position={[0, 2, 0]}>
      <mesh position={[0, 0, -160]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 300, 4]} />
        <meshBasicMaterial color="#374151" />
      </mesh>
      <mesh position={[160, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 300, 4]} />
        <meshBasicMaterial color="#374151" />
      </mesh>
      <Html position={[0, 0, -320]} distanceFactor={400} style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>N</span>
      </Html>
      <Html position={[330, 0, 0]} distanceFactor={400} style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>E</span>
      </Html>
    </group>
  )
}

// ── Overlay: Legend ────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: '#10b981', label: 'Productive Zone' },
    { color: '#f59e0b', label: 'Marginal Zone' },
    { color: '#ef4444', label: 'Non-Productive' },
    { color: '#06b6d4', label: 'Optimized Path' },
    { color: '#f59e0b', label: 'Kick-off Point', circle: true },
    { color: '#94a3b8', label: 'Vertical Reference' },
  ]
  return (
    <div className="absolute bottom-4 left-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Legend</p>
      <div className="flex flex-col gap-1.5">
        {items.map(({ color, label, circle }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-3 h-3 flex-shrink-0 ${circle ? 'rounded-full' : 'rounded-sm'}`} style={{ background: color }} />
            <span className="text-xs text-slate-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Overlay: Results stats ─────────────────────────────────────────────────────
function SceneStats({ trajectory }) {
  if (!trajectory) return null
  const pts = trajectory.trajectory ?? []
  const maxInc   = pts.length ? Math.max(...pts.map((p) => p.inclination ?? 0)) : null
  const departure = pts.length
    ? Math.sqrt((pts[pts.length - 1].x ?? 0) ** 2 + (pts[pts.length - 1].y ?? 0) ** 2)
    : null

  return (
    <div className="absolute top-4 right-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm min-w-44">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Results</p>
      <div className="flex flex-col gap-1.5">
        {[
          ['Fitness Score',     trajectory.fitness_score?.toFixed(4) ?? 'N/A',                          'text-geo-accent'],
          ['Zone Exposure',     trajectory.productive_zone_exposure != null ? `${(trajectory.productive_zone_exposure * 100).toFixed(1)}%` : 'N/A', 'text-geo-green'],
          ['Max DLS',           trajectory.max_dogleg_severity != null ? `${trajectory.max_dogleg_severity.toFixed(2)} °/30m` : 'N/A',             'text-geo-yellow'],
          ['Max Inclination',   maxInc != null ? `${maxInc.toFixed(1)}°` : 'N/A',                       'text-slate-200'],
          ['Lateral Departure', departure != null ? `${departure.toFixed(0)} m` : 'N/A',                'text-slate-200'],
          ['Survey Stations',   pts.length || 'N/A',                                                    'text-slate-200'],
        ].map(([label, value, cls]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-xs text-slate-500">{label}</span>
            <span className={`text-xs font-bold ${cls}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Overlay: GA convergence sparkline ─────────────────────────────────────────
function ConvergenceChart({ history }) {
  if (!history?.length) return null
  const W = 180, H = 56
  const min   = Math.min(...history)
  const max   = Math.max(...history)
  const range = max - min || 1

  const pts = history.map((v, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const polyline = pts.join(' ')
  const lastY    = H - ((history[history.length - 1] - min) / range) * (H - 4) - 2
  const gain     = max > history[0]
    ? `+${(((max - history[0]) / (Math.abs(history[0]) || 1)) * 100).toFixed(1)}%`
    : 'flat'

  return (
    <div className="absolute bottom-4 right-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GA Convergence</p>
        <span className="text-xs font-bold text-geo-green">{gain}</span>
      </div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${polyline} ${W},${H}`} fill="url(#sparkGrad)" />
        <polyline points={polyline} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="0"  cy={H - ((history[0] - min) / range) * (H - 4) - 2} r="2.5" fill="#94a3b8" />
        <circle cx={W}  cy={lastY} r="3.5" fill="#10b981" />
      </svg>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-slate-600">Gen 1</span>
        <span className="text-xs text-slate-500">{history.length} generations</span>
        <span className="text-xs text-geo-green font-semibold">{history[history.length - 1]?.toFixed(4)}</span>
      </div>
    </div>
  )
}

// ── Overlay: Camera controls panel ────────────────────────────────────────────
const PRESETS = [
  { key: 'perspective', label: 'Persp', title: 'Perspective view (default)' },
  { key: 'front',       label: 'Front', title: 'Front view (Y-Z plane)' },
  { key: 'side',        label: 'Side',  title: 'Side view (X-Z plane)' },
  { key: 'top',         label: 'Top',   title: 'Top-down plan view' },
]

function ControlsPanel({ preset, onPreset, autoRotate, onAutoRotate, showLabels, onToggleLabels }) {
  function handleReset() {
    onPreset('perspective')     // triggers CameraController via state
  }

  return (
    <div className="absolute top-4 left-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm select-none" style={{ minWidth: 168 }}>

      {/* Mouse hints */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Controls</p>
      <div className="flex flex-col gap-0.5 text-xs text-slate-500 mb-3">
        <span>🖱 Left drag — Rotate</span>
        <span>🖱 Right drag — Pan</span>
        <span>🖱 Scroll — Zoom</span>
      </div>

      {/* View presets */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Camera View</p>
      <div className="grid grid-cols-2 gap-1 mb-3">
        {PRESETS.map(({ key, label, title }) => (
          <button
            key={key}
            title={title}
            onClick={() => onPreset(key)}
            className={`
              px-2 py-1.5 rounded text-xs font-semibold border transition-all
              ${preset === key
                ? 'bg-geo-accent/20 border-geo-accent/50 text-geo-accent'
                : 'bg-geo-dark border-geo-border text-slate-400 hover:text-slate-200 hover:border-slate-500'}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold border border-geo-border bg-geo-dark text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" />
          </svg>
          Reset View
        </button>

        <button
          onClick={onAutoRotate}
          className={`
            w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold border transition-all
            ${autoRotate
              ? 'bg-geo-green/15 border-geo-green/40 text-geo-green'
              : 'bg-geo-dark border-geo-border text-slate-400 hover:text-slate-200'}
          `}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
          </svg>
          {autoRotate ? 'Stop Rotate' : 'Auto-Rotate'}
        </button>

        <button
          onClick={onToggleLabels}
          className={`
            w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold border transition-all
            ${showLabels
              ? 'bg-geo-accent/15 border-geo-accent/40 text-geo-accent'
              : 'bg-geo-dark border-geo-border text-slate-400 hover:text-slate-200'}
          `}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <circle cx="7" cy="7" r="1.5" fill="currentColor" />
          </svg>
          {showLabels ? 'Hide Labels' : 'Show Labels'}
        </button>
      </div>
    </div>
  )
}

// ── Main Scene ─────────────────────────────────────────────────────────────────
export default function Scene3D() {
  const { trajectory, wellLog } = useWellStore()
  const [showLabels, setShowLabels]   = useState(true)
  const [autoRotate, setAutoRotate]   = useState(false)
  const [cameraPreset, setCameraPreset] = useState('perspective')
  const orbitRef = useRef()

  const maxDepth = useMemo(() => {
    if (trajectory?.trajectory) return Math.max(...trajectory.trajectory.map((p) => p.z ?? p.depth ?? 0))
    if (wellLog?.depths)        return Math.max(...wellLog.depths)
    return 3000
  }, [trajectory, wellLog])

  return (
    <div
      className="relative w-full bg-geo-dark rounded-xl border border-geo-border overflow-hidden"
      style={{ minHeight: 620, height: '100%' }}
    >
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
            cellSize={50}      cellThickness={0.25} cellColor="#111827"
            sectionSize={200}  sectionThickness={0.7} sectionColor="#1f2937"
            fadeDistance={2500} fadeStrength={1.2}
          />

          <SurfaceRig />
          <CompassRose />
          <FormationLayers showLabels={showLabels} />
          <VerticalWell depthTop={0} depthBottom={maxDepth} />
          <DepthAxis maxDepth={maxDepth} />
          {trajectory && <WellTrajectory />}

          {/* Camera controller responds to preset state changes */}
          <CameraController preset={cameraPreset} maxDepth={maxDepth} orbitRef={orbitRef} />

          <OrbitControls
            ref={orbitRef}
            target={[0, -(maxDepth * 0.35), 0]}
            enableDamping
            dampingFactor={0.07}
            autoRotate={autoRotate}
            autoRotateSpeed={0.6}
            minDistance={100}
            maxDistance={10000}
            makeDefault
          />
        </Canvas>
      </Suspense>

      {/* HUD overlays */}
      <Legend />
      <SceneStats trajectory={trajectory} />
      <ControlsPanel
        preset={cameraPreset}
        onPreset={setCameraPreset}
        autoRotate={autoRotate}
        onAutoRotate={() => setAutoRotate((v) => !v)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((v) => !v)}
      />

      {trajectory?.generation_history?.length > 0 && (
        <ConvergenceChart history={trajectory.generation_history} />
      )}

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
