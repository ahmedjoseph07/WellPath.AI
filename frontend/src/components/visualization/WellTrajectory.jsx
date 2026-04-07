import { useMemo } from 'react'
import * as THREE from 'three'
import { CatmullRomCurve3 } from 'three'
import { Html } from '@react-three/drei'
import useWellStore from '../../store/wellStore'

// Map inclination angle to a color along the trajectory
function inclinationColor(inc) {
  // 0° vertical → cyan, 45°+ horizontal → green-blue
  const t = Math.min(inc / 75, 1)
  const r = Math.round(6  + t * (16  - 6))
  const g = Math.round(182 + t * (185 - 182))
  const b = Math.round(212 + t * (129 - 212))
  return `rgb(${r},${g},${b})`
}

export default function WellTrajectory() {
  const { trajectory } = useWellStore()
  const points = trajectory?.trajectory

  const { tubeArgs, tipPosition, kickoffPosition, waypoints } = useMemo(() => {
    if (!points || points.length < 2) return {}

    const threePoints = points.map((pt) =>
      new THREE.Vector3(pt.x ?? 0, -(pt.z ?? pt.depth ?? 0), pt.y ?? 0)
    )

    const curve    = new CatmullRomCurve3(threePoints, false, 'catmullrom', 0.5)
    const last     = threePoints[threePoints.length - 1]
    // Kickoff is where inclination first exceeds 3°
    const kickIdx  = points.findIndex((p) => (p.inclination ?? 0) > 3)
    const kickoff  = kickIdx >= 0 ? threePoints[kickIdx] : null

    return {
      tubeArgs:        { curve, segments: 160, radius: 3.5 },
      tipPosition:     last,
      kickoffPosition: kickoff,
      waypoints:       threePoints,
    }
  }, [points])

  if (!tubeArgs) return null

  return (
    <group>
      {/* Main trajectory tube */}
      <mesh>
        <tubeGeometry args={[tubeArgs.curve, tubeArgs.segments, tubeArgs.radius, 12, false]} />
        <meshPhongMaterial
          color="#06b6d4"
          emissive="#0c4a6e"
          emissiveIntensity={0.5}
          shininess={120}
          specular="#7dd3fc"
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Glow outer tube */}
      <mesh>
        <tubeGeometry args={[tubeArgs.curve, 80, tubeArgs.radius * 2.2, 8, false]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.06} />
      </mesh>

      {/* Survey station waypoint spheres */}
      {waypoints?.map((pt, i) => {
        const inc = points[i]?.inclination ?? 0
        const isFirst = i === 0
        const isLast  = i === waypoints.length - 1
        if (isFirst || isLast) return null // handled separately
        return (
          <mesh key={i} position={[pt.x, pt.y, pt.z]}>
            <sphereGeometry args={[4.5, 12, 12]} />
            <meshPhongMaterial
              color={inclinationColor(inc)}
              emissive="#0284c7"
              emissiveIntensity={0.3}
              shininess={80}
            />
          </mesh>
        )
      })}

      {/* Kickoff point marker */}
      {kickoffPosition && (
        <group position={[kickoffPosition.x, kickoffPosition.y, kickoffPosition.z]}>
          <mesh>
            <sphereGeometry args={[7, 16, 16]} />
            <meshPhongMaterial color="#f59e0b" emissive="#92400e" emissiveIntensity={0.6} shininess={100} />
          </mesh>
          <Html distanceFactor={500} style={{ pointerEvents: 'none', userSelect: 'none' }}>
            <div style={{
              background: 'rgba(17,24,39,0.9)',
              border: '1px solid #f59e0b60',
              borderLeft: '3px solid #f59e0b',
              borderRadius: 5,
              padding: '3px 7px',
              whiteSpace: 'nowrap',
              color: '#f59e0b',
              fontSize: 10,
              fontWeight: 700,
            }}>
              ↗ Kick-off Point
            </div>
          </Html>
        </group>
      )}

      {/* Well tip (TD) */}
      {tipPosition && (
        <group position={[tipPosition.x, tipPosition.y, tipPosition.z]}>
          <mesh>
            <sphereGeometry args={[8, 16, 16]} />
            <meshPhongMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={0.9}
              shininess={200}
            />
          </mesh>
          <Html distanceFactor={500} style={{ pointerEvents: 'none', userSelect: 'none' }}>
            <div style={{
              background: 'rgba(17,24,39,0.9)',
              border: '1px solid #06b6d460',
              borderLeft: '3px solid #06b6d4',
              borderRadius: 5,
              padding: '3px 8px',
              whiteSpace: 'nowrap',
            }}>
              <div style={{ color: '#06b6d4', fontWeight: 700, fontSize: 10 }}>TD (Total Depth)</div>
              {points && (
                <div style={{ color: '#64748b', fontSize: 9 }}>
                  Inc: {(points[points.length - 1]?.inclination ?? 0).toFixed(1)}°
                  &nbsp;|&nbsp;
                  Az: {(points[points.length - 1]?.azimuth ?? 0).toFixed(1)}°
                </div>
              )}
            </div>
          </Html>
        </group>
      )}

      {/* Surface origin marker */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshPhongMaterial color="#f8fafc" emissive="#94a3b8" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}
