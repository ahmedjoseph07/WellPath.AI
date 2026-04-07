import React, { useMemo } from 'react'
import * as THREE from 'three'

export default function VerticalWell({ depthTop = 0, depthBottom = 3000 }) {
  const height = depthBottom - depthTop
  const centerY = -((depthTop + depthBottom) / 2)

  return (
    <group>
      <mesh position={[0, centerY, 0]}>
        <cylinderGeometry args={[1, 1, height, 8]} />
        <meshPhongMaterial
          color="#94a3b8"
          transparent
          opacity={0.4}
          shininess={30}
        />
      </mesh>
      {/* Dashed ring markers every 500m */}
      {Array.from({ length: Math.floor(height / 500) }).map((_, i) => {
        const depth = depthTop + (i + 1) * 500
        return (
          <mesh key={i} position={[0, -depth, 0]}>
            <torusGeometry args={[6, 0.5, 6, 24]} />
            <meshPhongMaterial color="#475569" transparent opacity={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}
