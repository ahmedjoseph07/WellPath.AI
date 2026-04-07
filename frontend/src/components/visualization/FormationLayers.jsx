import React from 'react'
import { useRef } from 'react'
import useWellStore from '../../store/wellStore'

function FormationLayer({ layer }) {
  const { depth_top, depth_bottom, label, avg_score } = layer
  const height = depth_bottom - depth_top
  const centerY = -((depth_top + depth_bottom) / 2)

  let color, opacity
  if (avg_score > 0.6 || label === 'productive') {
    color = '#10b981'
    opacity = 0.65
  } else if (avg_score > 0.35 || label === 'marginal') {
    color = '#f59e0b'
    opacity = 0.5
  } else {
    color = '#ef4444'
    opacity = 0.35
  }

  return (
    <mesh position={[0, centerY, 0]}>
      <boxGeometry args={[400, height, 400]} />
      <meshPhongMaterial
        color={color}
        transparent
        opacity={opacity}
        shininess={20}
      />
    </mesh>
  )
}

export default function FormationLayers() {
  const { trajectory } = useWellStore()
  const layers = trajectory?.formation_layers

  if (!layers || !Array.isArray(layers) || layers.length === 0) return null

  return (
    <group>
      {layers.map((layer, idx) => (
        <FormationLayer key={idx} layer={layer} />
      ))}
    </group>
  )
}
