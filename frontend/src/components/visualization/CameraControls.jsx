import React from 'react'
import { OrbitControls } from '@react-three/drei'

export default function CameraControls() {
  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.6}
      zoomSpeed={1.2}
      panSpeed={0.8}
      minDistance={50}
      maxDistance={8000}
    />
  )
}
