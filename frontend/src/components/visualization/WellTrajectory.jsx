import React, { useMemo } from 'react'
import * as THREE from 'three'
import { CatmullRomCurve3 } from 'three'
import useWellStore from '../../store/wellStore'

export default function WellTrajectory() {
  const { trajectory } = useWellStore()
  const points = trajectory?.trajectory

  const { tubeArgs, tipPosition } = useMemo(() => {
    if (!points || points.length < 2) return { tubeArgs: null, tipPosition: null }

    const threePoints = points.map((pt) => new THREE.Vector3(
      pt.x ?? 0,
      -(pt.z ?? pt.depth ?? 0),  // TVD → negative Y in Three.js
      pt.y ?? 0,
    ))

    const curve = new CatmullRomCurve3(threePoints, false, 'catmullrom', 0.5)
    const last = threePoints[threePoints.length - 1]

    return { tubeArgs: { curve, segments: 128, radius: 3 }, tipPosition: last }
  }, [points])

  if (!tubeArgs) return null

  return (
    <group>
      <mesh>
        <tubeGeometry
          args={[tubeArgs.curve, tubeArgs.segments, tubeArgs.radius, 12, false]}
        />
        <meshPhongMaterial
          color="#06b6d4"
          emissive="#0284c7"
          emissiveIntensity={0.4}
          shininess={100}
          specular="#7dd3fc"
        />
      </mesh>

      {/* Well tip sphere */}
      {tipPosition && (
        <mesh position={[tipPosition.x, tipPosition.y, tipPosition.z]}>
          <sphereGeometry args={[7, 16, 16]} />
          <meshPhongMaterial
            color="#06b6d4"
            emissive="#06b6d4"
            emissiveIntensity={0.8}
            shininess={200}
          />
        </mesh>
      )}

      {/* Surface origin marker */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshPhongMaterial color="#f8fafc" emissive="#94a3b8" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}
