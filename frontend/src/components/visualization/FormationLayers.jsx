import { Html } from '@react-three/drei'
import useWellStore from '../../store/wellStore'

const ZONE_CONFIG = {
  productive:       { color: '#10b981', opacity: 0.55, emissive: '#064e3b' },
  marginal:         { color: '#f59e0b', opacity: 0.45, emissive: '#451a03' },
  'non-productive': { color: '#ef4444', opacity: 0.30, emissive: '#450a0a' },
}

function FormationLayer({ layer, showLabels }) {
  const { depth_top, depth_bottom, label, avg_score } = layer
  const height      = depth_bottom - depth_top
  const centerY     = -((depth_top + depth_bottom) / 2)
  const cfg         = ZONE_CONFIG[label] ?? ZONE_CONFIG['non-productive']
  const thickLabel  = height >= 1000 ? 'Very thick' : height >= 300 ? 'Thick' : height >= 100 ? 'Moderate' : 'Thin'

  return (
    <group position={[0, centerY, 0]}>
      {/* Main formation box */}
      <mesh>
        <boxGeometry args={[400, height, 400]} />
        <meshPhongMaterial
          color={cfg.color}
          emissive={cfg.emissive}
          emissiveIntensity={0.15}
          transparent
          opacity={cfg.opacity}
          shininess={10}
        />
      </mesh>

      {/* Top edge outline */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[401, 1.5, 401]} />
        <meshBasicMaterial color={cfg.color} transparent opacity={0.6} />
      </mesh>

      {/* Bottom edge outline */}
      <mesh position={[0, -height / 2, 0]}>
        <boxGeometry args={[401, 1.5, 401]} />
        <meshBasicMaterial color={cfg.color} transparent opacity={0.3} />
      </mesh>

      {/* Html label — right side of box */}
      {showLabels && (
        <Html
          position={[215, 0, 0]}
          distanceFactor={500}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div style={{
            background: 'rgba(17,24,39,0.92)',
            border: `1px solid ${cfg.color}40`,
            borderLeft: `3px solid ${cfg.color}`,
            borderRadius: 6,
            padding: '5px 8px',
            whiteSpace: 'nowrap',
            minWidth: 130,
          }}>
            <div style={{ color: cfg.color, fontWeight: 700, fontSize: 11, textTransform: 'capitalize', marginBottom: 2 }}>
              {label.replace('-', ' ')}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 10 }}>
              {depth_top.toFixed(0)}–{depth_bottom.toFixed(0)} m
            </div>
            <div style={{ color: '#64748b', fontSize: 10 }}>
              {height.toFixed(0)} m · {thickLabel}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 10 }}>
              Score: <span style={{ color: cfg.color, fontWeight: 600 }}>{avg_score.toFixed(3)}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

export default function FormationLayers({ showLabels = true }) {
  const { trajectory } = useWellStore()
  const layers = trajectory?.formation_layers

  if (!layers || !Array.isArray(layers) || layers.length === 0) return null

  return (
    <group>
      {layers.map((layer, idx) => (
        <FormationLayer key={idx} layer={layer} showLabels={showLabels} />
      ))}
    </group>
  )
}
