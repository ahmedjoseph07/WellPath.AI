import React, { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Grid, Environment } from '@react-three/drei'
import FormationLayers from './FormationLayers'
import WellTrajectory from './WellTrajectory'
import VerticalWell from './VerticalWell'
import CameraControls from './CameraControls'
import useWellStore from '../../store/wellStore'

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[500, 500, 500]}
        intensity={1.2}
        castShadow
      />
      <directionalLight
        position={[-300, -800, -300]}
        intensity={0.3}
        color="#06b6d4"
      />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#e2e8f0" />
    </>
  )
}

function DepthAxis({ maxDepth }) {
  const ticks = Math.ceil(maxDepth / 500)
  return (
    <group>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const depth = i * 500
        return (
          <group key={i} position={[220, -depth, 0]}>
            <mesh>
              <boxGeometry args={[15, 0.5, 0.5]} />
              <meshBasicMaterial color="#374151" />
            </mesh>
          </group>
        )
      })}
      {/* Vertical axis line */}
      <mesh position={[220, -(maxDepth / 2), 0]}>
        <cylinderGeometry args={[0.3, 0.3, maxDepth, 4]} />
        <meshBasicMaterial color="#374151" />
      </mesh>
    </group>
  )
}

function Legend() {
  const items = [
    { color: '#10b981', label: 'Productive Zone' },
    { color: '#f59e0b', label: 'Marginal Zone' },
    { color: '#ef4444', label: 'Non-Productive' },
    { color: '#06b6d4', label: 'Optimized Path' },
    { color: '#94a3b8', label: 'Vertical Reference' },
  ]
  return (
    <div className="absolute bottom-4 left-4 bg-geo-panel/90 border border-geo-border rounded-xl p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Legend</p>
      <div className="flex flex-col gap-1.5">
        {items.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
            <span className="text-xs text-slate-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SceneStats({ trajectory }) {
  if (!trajectory) return null
  return (
    <div className="absolute top-4 right-4 bg-geo-panel/90 border border-geo-border rounded-xl p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Results</p>
      <div className="flex flex-col gap-1.5">
        <div>
          <span className="text-xs text-slate-500">Fitness Score</span>
          <span className="text-xs font-bold text-geo-accent ml-2">
            {trajectory.fitness_score?.toFixed(4) ?? 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500">Productive Exposure</span>
          <span className="text-xs font-bold text-geo-green ml-2">
            {trajectory.productive_zone_exposure != null
              ? `${(trajectory.productive_zone_exposure * 100).toFixed(1)}%`
              : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500">Max DLS</span>
          <span className="text-xs font-bold text-geo-yellow ml-2">
            {trajectory.max_dogleg_severity != null
              ? `${trajectory.max_dogleg_severity.toFixed(2)} °/30m`
              : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  )
}

function Controls3D() {
  return (
    <div className="absolute top-4 left-4 bg-geo-panel/90 border border-geo-border rounded-xl p-2 backdrop-blur-sm">
      <p className="text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">3D Controls</p>
      <div className="flex flex-col gap-1 text-xs text-slate-500">
        <span>Left drag: Rotate</span>
        <span>Right drag: Pan</span>
        <span>Scroll: Zoom</span>
      </div>
    </div>
  )
}

export default function Scene3D() {
  const { trajectory, wellLog } = useWellStore()

  const maxDepth = trajectory?.trajectory
    ? Math.max(...trajectory.trajectory.map((p) => p.z ?? p.depth ?? 0))
    : wellLog?.depths
    ? Math.max(...wellLog.depths)
    : 3000

  const cameraTarget = [0, -(maxDepth / 2), 0]

  return (
    <div className="relative w-full bg-geo-dark rounded-xl border border-geo-border overflow-hidden" style={{ minHeight: 600, height: '100%' }}>
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
            position: [400, -(maxDepth * 0.3), 600],
            fov: 50,
            near: 1,
            far: 20000,
            up: [0, 1, 0],
          }}
          style={{ background: '#0a0e1a' }}
        >
          <SceneLights />
          <Stars
            radius={5000}
            depth={50}
            count={2000}
            factor={4}
            saturation={0}
            fade
            speed={0.2}
          />
          <Grid
            position={[0, 0, 0]}
            args={[800, 800]}
            cellSize={50}
            cellThickness={0.3}
            cellColor="#1f2937"
            sectionSize={200}
            sectionThickness={0.8}
            sectionColor="#374151"
            fadeDistance={2000}
            fadeStrength={1}
          />
          <FormationLayers />
          <VerticalWell depthTop={0} depthBottom={maxDepth} />
          <DepthAxis maxDepth={maxDepth} />
          {trajectory && <WellTrajectory />}
          <CameraControls />
        </Canvas>
      </Suspense>

      <Legend />
      <SceneStats trajectory={trajectory} />
      <Controls3D />

      {!trajectory && (
        <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none">
          <div className="bg-geo-panel/80 border border-geo-border rounded-xl px-6 py-3 backdrop-blur-sm text-center">
            <p className="text-sm text-slate-300 font-medium">Run GA Optimization to see the well trajectory</p>
            <p className="text-xs text-slate-500 mt-1">Formation layers will appear after optimization</p>
          </div>
        </div>
      )}
    </div>
  )
}
