import { Suspense, useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Grid, Html } from '@react-three/drei'
import FormationLayers from './FormationLayers'
import WellTrajectory from './WellTrajectory'
import VerticalWell from './VerticalWell'
import useWellStore from '../../store/wellStore'

// ─── Mouse button codes (THREE.MOUSE enum values) ────────────────────────────
const MOUSE = { ROTATE: 0, DOLLY: 1, PAN: 2 }

// Cursor per mode/state
function getCursor(mode, dragging) {
  if (mode === 'grab') return dragging ? 'grabbing' : 'grab'
  if (mode === 'zoom') return dragging ? 'zoom-out' : 'zoom-in'
  // orbit
  return dragging ? 'grabbing' : 'default'
}

// ─── Lighting ────────────────────────────────────────────────────────────────
function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[600, 600, 600]} intensity={1.3} castShadow />
      <directionalLight position={[-400, -900, -400]} intensity={0.4} color="#06b6d4" />
      <pointLight position={[0, -400, 0]} intensity={0.5} color="#10b981" distance={3000} />
      <pointLight position={[0, 50, 0]} intensity={0.3} color="#f8fafc" distance={800} />
    </>
  )
}

// ─── Camera controller ───────────────────────────────────────────────────────
function CameraController({ preset, maxDepth, orbitRef }) {
  const { camera } = useThree()
  useEffect(() => {
    const hd  = maxDepth * 0.5
    const cfg = {
      perspective: { pos: [520, -(maxDepth * 0.22), 680], tgt: [0, -hd * 0.7, 0] },
      front:       { pos: [0,  -hd, maxDepth * 0.9],      tgt: [0, -hd, 0] },
      side:        { pos: [maxDepth * 0.9, -hd, 0],        tgt: [0, -hd, 0] },
      top:         { pos: [0,  300, 10],                   tgt: [0, -hd, 0] },
    }
    const { pos, tgt } = cfg[preset] ?? cfg.perspective
    camera.position.set(...pos)
    if (orbitRef.current) {
      orbitRef.current.target.set(...tgt)
      orbitRef.current.update()
    }
  }, [preset, maxDepth, camera, orbitRef])
  return null
}

// ─── Ground plane ─────────────────────────────────────────────────────────────
function GroundPlane() {
  const size = 1000
  return (
    <group>
      {/* Main ground slab */}
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[size, 4, size]} />
        <meshPhongMaterial color="#0b1423" shininess={8} />
      </mesh>

      {/* Top surface highlight strip */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[size + 2, 0.6, size + 2]} />
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.5} />
      </mesh>

      {/* Perimeter border frame */}
      {[
        [0, 0, -(size / 2)],  // North edge
        [0, 0,  (size / 2)],  // South edge
        [-(size / 2), 0, 0],  // West edge
        [ (size / 2), 0, 0],  // East edge
      ].map(([x, y, z], i) => {
        const isNS = i < 2
        return (
          <mesh key={i} position={[x, y, z]}>
            <boxGeometry args={isNS ? [size, 1, 2] : [2, 1, size]} />
            <meshBasicMaterial color="#1e3a5f" transparent opacity={0.6} />
          </mesh>
        )
      })}

      {/* "GROUND LEVEL" label at the origin */}
      <Html position={[30, 8, 0]} distanceFactor={400} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{
          background: 'rgba(11,20,35,0.9)',
          border: '1px solid #1e3a5f',
          borderLeft: '3px solid #38bdf8',
          borderRadius: 5,
          padding: '4px 8px',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#38bdf8', fontSize: 11, fontWeight: 700 }}>Ground Level</span>
          <span style={{ color: '#475569', fontSize: 10, marginLeft: 6 }}>0 m TVD</span>
        </div>
      </Html>

      {/* Scale bar on ground (200 m) */}
      <group position={[-380, 3, -380]}>
        <mesh>
          <boxGeometry args={[200, 1.5, 1.5]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
        <mesh position={[-100, 0, 0]}>
          <boxGeometry args={[2, 8, 2]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
        <mesh position={[100, 0, 0]}>
          <boxGeometry args={[2, 8, 2]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
        <Html position={[0, 14, 0]} distanceFactor={350} style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{ color: '#475569', fontSize: 10, whiteSpace: 'nowrap', textAlign: 'center', fontFamily: 'monospace' }}>
            ←——200 m——→
          </div>
        </Html>
      </group>

      {/* Well coordinates label at origin */}
      <Html position={[-30, 8, 30]} distanceFactor={400} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{
          background: 'rgba(11,20,35,0.88)',
          border: '1px solid #1f2937',
          borderRadius: 4,
          padding: '3px 7px',
          whiteSpace: 'nowrap',
          color: '#4b5563',
          fontSize: 9,
          fontFamily: 'monospace',
        }}>
          (0, 0) · Well A-1
        </div>
      </Html>
    </group>
  )
}

// ─── Ground axis arrows ────────────────────────────────────────────────────────
function GroundAxes() {
  const len = 260

  return (
    <group position={[0, 4, 0]}>
      {/* North arrow (−Z) */}
      <group>
        <mesh position={[0, 0, -len / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.5, 1.5, len, 6]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.75} />
        </mesh>
        <mesh position={[0, 0, -len - 10]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[6, 16, 8]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
        <Html position={[0, 0, -len - 35]} distanceFactor={350} style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>N</span>
        </Html>
      </group>

      {/* South label (opposite) */}
      <Html position={[0, 0, len + 25]} distanceFactor={350} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <span style={{ color: '#374151', fontSize: 10, fontWeight: 600 }}>S</span>
      </Html>

      {/* East arrow (+X) */}
      <group>
        <mesh position={[len / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[1.5, 1.5, len, 6]} />
          <meshBasicMaterial color="#64748b" transparent opacity={0.65} />
        </mesh>
        <mesh position={[len + 10, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[6, 16, 8]} />
          <meshBasicMaterial color="#64748b" />
        </mesh>
        <Html position={[len + 35, 0, 0]} distanceFactor={350} style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>E</span>
        </Html>
      </group>

      {/* West label */}
      <Html position={[-len - 25, 0, 0]} distanceFactor={350} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <span style={{ color: '#374151', fontSize: 10, fontWeight: 600 }}>W</span>
      </Html>
    </group>
  )
}

// ─── Depth axis with labels ───────────────────────────────────────────────────
function DepthAxis({ maxDepth }) {
  const step = maxDepth <= 1500 ? 200 : maxDepth <= 3000 ? 500 : 1000
  const ticks = useMemo(() => {
    const t = []
    for (let d = 0; d <= maxDepth; d += step) t.push(d)
    return t
  }, [maxDepth, step])

  return (
    <group>
      {/* Axis line */}
      <mesh position={[250, -(maxDepth / 2), 0]}>
        <cylinderGeometry args={[0.5, 0.5, maxDepth, 4]} />
        <meshBasicMaterial color="#1e3a5f" />
      </mesh>

      {ticks.map((depth) => (
        <group key={depth} position={[250, -depth, 0]}>
          <mesh>
            <boxGeometry args={[16, 1.5, 1.5]} />
            <meshBasicMaterial color={depth === 0 ? '#38bdf8' : '#1e3a5f'} />
          </mesh>
          <Html position={[20, 0, 0]} distanceFactor={320} style={{ pointerEvents: 'none', userSelect: 'none' }}>
            <span style={{
              color: depth === 0 ? '#38bdf8' : '#374151',
              fontSize: 10,
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              fontWeight: depth === 0 ? 700 : 400,
            }}>
              {depth === 0 ? '0 m (surface)' : `${depth} m`}
            </span>
          </Html>
        </group>
      ))}

      {/* TVD header */}
      <Html position={[250, 28, 0]} distanceFactor={320} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <span style={{ color: '#1e3a5f', fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>
          TVD ↓
        </span>
      </Html>

      {/* Bottom label */}
      <Html position={[250, -(maxDepth + 30), 0]} distanceFactor={320} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <span style={{ color: '#374151', fontSize: 9, fontFamily: 'monospace' }}>
          TD: {maxDepth.toFixed(0)} m
        </span>
      </Html>
    </group>
  )
}

// ─── Surface rig ─────────────────────────────────────────────────────────────
function SurfaceRig() {
  return (
    <group position={[0, 8, 0]}>
      <mesh><boxGeometry args={[60, 6, 60]} /><meshPhongMaterial color="#1e293b" shininess={25} /></mesh>
      <mesh><boxGeometry args={[62, 1, 62]} /><meshBasicMaterial color="#334155" /></mesh>
      {[[-22, 0, -22], [22, 0, -22], [-22, 0, 22], [22, 0, 22]].map(([x, , z], i) => (
        <mesh key={i} position={[x, -16, z]}><cylinderGeometry args={[2, 2.5, 26, 8]} /><meshPhongMaterial color="#0f172a" /></mesh>
      ))}
      <mesh position={[0, 46, 0]}><cylinderGeometry args={[1, 4, 80, 8]} /><meshPhongMaterial color="#334155" shininess={40} /></mesh>
      {[20, 40, 60].map((h) => (
        <mesh key={h} position={[0, h, 0]}><boxGeometry args={[14, 1, 2]} /><meshBasicMaterial color="#374151" /></mesh>
      ))}
      <mesh position={[0, 89, 0]}><boxGeometry args={[14, 8, 14]} /><meshPhongMaterial color="#475569" shininess={60} /></mesh>
      <mesh position={[0, 100, 0]}><cylinderGeometry args={[0.6, 0.6, 18, 6]} /><meshPhongMaterial color="#64748b" /></mesh>
      <mesh position={[0, -7, 0]}><cylinderGeometry args={[6, 7, 10, 12]} /><meshPhongMaterial color="#475569" shininess={70} /></mesh>
      <mesh position={[0, -14, 0]}><boxGeometry args={[12, 10, 12]} /><meshPhongMaterial color="#1e293b" /></mesh>
      <Html position={[40, 60, 0]} distanceFactor={400} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{
          background: 'rgba(11,20,35,0.88)', border: '1px solid #06b6d440',
          borderLeft: '3px solid #06b6d4', borderRadius: 5,
          padding: '4px 8px', whiteSpace: 'nowrap',
        }}>
          <div style={{ color: '#06b6d4', fontSize: 11, fontWeight: 700 }}>Well A-1</div>
          <div style={{ color: '#475569', fontSize: 9 }}>Drilling Rig · Surface Location</div>
        </div>
      </Html>
    </group>
  )
}

// ─── Overlay: Legend ─────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: '#10b981', label: 'Productive Zone',  shape: 'square' },
    { color: '#f59e0b', label: 'Marginal Zone',    shape: 'square' },
    { color: '#ef4444', label: 'Non-Productive',   shape: 'square' },
    { color: '#06b6d4', label: 'Optimized Path',   shape: 'line'   },
    { color: '#f59e0b', label: 'Kick-off Point',   shape: 'circle' },
    { color: '#94a3b8', label: 'Vertical Reference', shape: 'line' },
    { color: '#38bdf8', label: 'Ground Level',     shape: 'line'   },
  ]
  return (
    <div className="absolute bottom-20 left-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Legend</p>
      <div className="flex flex-col gap-1.5">
        {items.map(({ color, label, shape }) => (
          <div key={label} className="flex items-center gap-2">
            {shape === 'square' && <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />}
            {shape === 'circle' && <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />}
            {shape === 'line'   && <div className="w-4 h-0.5 flex-shrink-0 rounded-full" style={{ background: color }} />}
            <span className="text-xs text-slate-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Overlay: Results stats ───────────────────────────────────────────────────
function SceneStats({ trajectory }) {
  if (!trajectory) return null
  const pts = trajectory.trajectory ?? []
  const maxInc    = pts.length ? Math.max(...pts.map((p) => p.inclination ?? 0)) : null
  const departure = pts.length
    ? Math.sqrt((pts[pts.length - 1].x ?? 0) ** 2 + (pts[pts.length - 1].y ?? 0) ** 2)
    : null
  const tdDepth = pts.length ? (pts[pts.length - 1].z ?? pts[pts.length - 1].depth ?? null) : null

  return (
    <div className="absolute top-4 right-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm" style={{ minWidth: 192 }}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Optimization Results</p>
      <div className="flex flex-col gap-1.5">
        {[
          ['Fitness Score',      trajectory.fitness_score?.toFixed(4)       ?? 'N/A', 'text-geo-accent'],
          ['Zone Exposure',      trajectory.productive_zone_exposure != null
                                  ? `${(trajectory.productive_zone_exposure * 100).toFixed(1)}%` : 'N/A', 'text-geo-green'],
          ['Max DLS',            trajectory.max_dogleg_severity != null
                                  ? `${trajectory.max_dogleg_severity.toFixed(2)} °/30m` : 'N/A', 'text-geo-yellow'],
          ['Max Inclination',    maxInc    != null ? `${maxInc.toFixed(1)}°`     : 'N/A', 'text-slate-200'],
          ['Lateral Departure',  departure != null ? `${departure.toFixed(0)} m` : 'N/A', 'text-slate-200'],
          ['Total Depth (TD)',   tdDepth   != null ? `${tdDepth.toFixed(0)} m`   : 'N/A', 'text-slate-200'],
          ['Survey Stations',    pts.length || 'N/A',                                      'text-slate-200'],
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

// ─── Overlay: GA convergence ─────────────────────────────────────────────────
function ConvergenceChart({ history }) {
  if (!history?.length) return null
  const W = 190, H = 54
  const min = Math.min(...history), max = Math.max(...history)
  const range = max - min || 1
  const poly  = history.map((v, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastY = H - ((history[history.length - 1] - min) / range) * (H - 4) - 2
  const gain  = max > history[0]
    ? `+${(((max - history[0]) / (Math.abs(history[0]) || 1)) * 100).toFixed(1)}%`
    : 'flat'
  return (
    <div className="absolute bottom-20 right-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GA Convergence</p>
        <span className="text-xs font-bold text-geo-green">{gain}</span>
      </div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${poly} ${W},${H}`} fill="url(#sg2)" />
        <polyline points={poly} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="0"  cy={H - ((history[0] - min) / range) * (H - 4) - 2} r="2.5" fill="#94a3b8" />
        <circle cx={W}  cy={lastY} r="3.5" fill="#10b981" />
      </svg>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-slate-600">Gen 1</span>
        <span className="text-xs text-slate-500">{history.length} gens</span>
        <span className="text-xs text-geo-green font-semibold">{history[history.length - 1]?.toFixed(4)}</span>
      </div>
    </div>
  )
}

// ─── Overlay: Top-left controls panel ────────────────────────────────────────
const PRESETS = [
  { key: 'perspective', label: 'Persp' },
  { key: 'front',       label: 'Front' },
  { key: 'side',        label: 'Side'  },
  { key: 'top',         label: 'Top'   },
]

function ControlsPanel({ preset, onPreset, autoRotate, onAutoRotate, showLabels, onToggleLabels }) {
  return (
    <div className="absolute top-4 left-4 bg-geo-panel/92 border border-geo-border rounded-xl p-3 backdrop-blur-sm select-none" style={{ minWidth: 168 }}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Camera View</p>
      <div className="grid grid-cols-2 gap-1 mb-3">
        {PRESETS.map(({ key, label }) => (
          <button key={key} onClick={() => onPreset(key)} className={`
            px-2 py-1.5 rounded text-xs font-semibold border transition-all
            ${preset === key
              ? 'bg-geo-accent/20 border-geo-accent/50 text-geo-accent'
              : 'bg-geo-dark border-geo-border text-slate-400 hover:text-slate-200 hover:border-slate-500'}
          `}>{label}</button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <button onClick={() => onPreset('perspective')} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold border border-geo-border bg-geo-dark text-slate-400 hover:text-slate-200 transition-all">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          Reset View
        </button>
        <button onClick={onAutoRotate} className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold border transition-all ${autoRotate ? 'bg-geo-green/15 border-geo-green/40 text-geo-green' : 'bg-geo-dark border-geo-border text-slate-400 hover:text-slate-200'}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" /></svg>
          {autoRotate ? 'Stop Rotate' : 'Auto-Rotate'}
        </button>
        <button onClick={onToggleLabels} className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold border transition-all ${showLabels ? 'bg-geo-accent/15 border-geo-accent/40 text-geo-accent' : 'bg-geo-dark border-geo-border text-slate-400 hover:text-slate-200'}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><circle cx="7" cy="7" r="1.5" fill="currentColor" /></svg>
          {showLabels ? 'Hide Labels' : 'Show Labels'}
        </button>
      </div>
    </div>
  )
}

// ─── Overlay: Bottom-center mode toolbar ─────────────────────────────────────
const MODES = [
  {
    key: 'orbit',
    label: 'Orbit',
    hint: 'Click & drag to rotate',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        <path d="M2 12h20M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10" />
      </svg>
    ),
  },
  {
    key: 'grab',
    label: 'Grab',
    hint: 'Click & drag to pan',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 11V6a2 2 0 00-2-2 2 2 0 00-2 2v0M14 10V4a2 2 0 00-2-2 2 2 0 00-2 2v2M10 10.5V6a2 2 0 00-2-2 2 2 0 00-2 2v8" />
        <path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15" />
      </svg>
    ),
  },
  {
    key: 'zoom',
    label: 'Zoom',
    hint: 'Drag up/down to zoom',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
      </svg>
    ),
  },
]

function ModeBar({ mode, onMode }) {
  return (
    <div
      className="absolute bottom-4 bg-geo-panel/95 border border-geo-border rounded-xl backdrop-blur-sm select-none overflow-hidden"
      style={{ left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
    >
      <div className="flex items-stretch">
        {MODES.map(({ key, label, hint, icon }, i) => {
          const active = mode === key
          return (
            <button
              key={key}
              title={hint}
              onClick={() => onMode(key)}
              className={`
                flex flex-col items-center gap-1 px-5 py-2.5 text-xs font-semibold transition-all border-0
                ${i > 0 ? 'border-l border-geo-border' : ''}
                ${active
                  ? 'bg-geo-accent/20 text-geo-accent'
                  : 'bg-transparent text-slate-400 hover:bg-geo-border/40 hover:text-slate-200'}
              `}
            >
              <span className={active ? 'text-geo-accent' : 'text-slate-500'}>{icon}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>
      {/* Active mode hint */}
      <div className="border-t border-geo-border text-center py-1 px-4">
        <span className="text-xs text-slate-600">{MODES.find(m => m.key === mode)?.hint}</span>
      </div>
    </div>
  )
}

// ─── Main Scene ───────────────────────────────────────────────────────────────
export default function Scene3D() {
  const { trajectory, wellLog } = useWellStore()
  const [showLabels,   setShowLabels]   = useState(true)
  const [autoRotate,   setAutoRotate]   = useState(false)
  const [cameraPreset, setCameraPreset] = useState('perspective')
  const [mode,         setMode]         = useState('orbit')   // 'orbit' | 'grab' | 'zoom'
  const [dragging,     setDragging]     = useState(false)
  const orbitRef = useRef()

  const maxDepth = useMemo(() => {
    if (trajectory?.trajectory) return Math.max(...trajectory.trajectory.map((p) => p.z ?? p.depth ?? 0))
    if (wellLog?.depths)        return Math.max(...wellLog.depths)
    return 3000
  }, [trajectory, wellLog])

  // OrbitControls mouseButtons based on active mode
  const mouseButtons = useMemo(() => {
    if (mode === 'grab') return { LEFT: MOUSE.PAN,    MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }
    if (mode === 'zoom') return { LEFT: MOUSE.DOLLY,  MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN    }
    return               { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN    }
  }, [mode])

  const cursor = getCursor(mode, dragging)

  // Switch to grab mode cursor on pointer interactions with canvas
  const handlePointerDown = useCallback(() => setDragging(true),  [])
  const handlePointerUp   = useCallback(() => setDragging(false), [])

  return (
    <div
      className="relative w-full bg-geo-dark rounded-xl border border-geo-border overflow-hidden"
      style={{ minHeight: 640, height: '100%', cursor }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
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
          camera={{ position: [520, -(maxDepth * 0.22), 680], fov: 48, near: 1, far: 25000, up: [0, 1, 0] }}
          style={{ background: '#060a14' }}
        >
          <SceneLights />
          <Stars radius={6000} depth={60} count={2500} factor={4} saturation={0.1} fade speed={0.15} />

          {/* Surface grid — on top of ground plane */}
          <Grid
            position={[0, 1, 0]}
            args={[900, 900]}
            cellSize={50}     cellThickness={0.2}  cellColor="#0d1b2a"
            sectionSize={200} sectionThickness={0.6} sectionColor="#1e3a5f"
            fadeDistance={2800} fadeStrength={1}
          />

          <GroundPlane />
          <GroundAxes />
          <SurfaceRig />
          <FormationLayers showLabels={showLabels} />
          <VerticalWell depthTop={0} depthBottom={maxDepth} />
          <DepthAxis maxDepth={maxDepth} />
          {trajectory && <WellTrajectory />}

          <CameraController preset={cameraPreset} maxDepth={maxDepth} orbitRef={orbitRef} />

          <OrbitControls
            ref={orbitRef}
            target={[0, -(maxDepth * 0.4), 0]}
            enableDamping
            dampingFactor={0.08}
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            minDistance={80}
            maxDistance={12000}
            mouseButtons={mouseButtons}
            makeDefault
          />
        </Canvas>
      </Suspense>

      {/* ── HUD overlays ──────────────────────────────────────────────── */}
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

      {/* Bottom-center mode toolbar */}
      <ModeBar mode={mode} onMode={setMode} />

      {/* Pre-optimization hint */}
      {!trajectory && (
        <div className="absolute pointer-events-none" style={{ bottom: 80, left: '50%', transform: 'translateX(-50%)' }}>
          <div className="bg-geo-panel/85 border border-geo-border rounded-xl px-5 py-2.5 backdrop-blur-sm text-center whitespace-nowrap">
            <p className="text-sm text-slate-300 font-medium">Run GA Optimization to see the optimized trajectory</p>
            <p className="text-xs text-slate-500 mt-0.5">Ground plane · Axis labels · Formation layers · Scale bar</p>
          </div>
        </div>
      )}
    </div>
  )
}
