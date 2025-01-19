import { useRef } from "react"
import type * as THREE from "three"
import { STLLoader } from "../../../node_modules/three-stdlib/loaders/STLLoader.js"

const stlLoader = new STLLoader()

export function STLModel({
  stlData,
  mtlData,
  color,
  opacity = 1,
}: {
  stlData: ArrayBuffer
  color?: any
  mtlData?: ArrayBuffer
  opacity?: number
}) {
  const geom = stlLoader.parse(stlData)
  const mesh = useRef<THREE.Mesh>()

  // TODO load MTL

  return (
    <mesh ref={mesh as any}>
      <primitive object={geom} attach="geometry" />
      <meshStandardMaterial
        color={color}
        transparent={opacity !== 1}
        opacity={opacity}
      />
      {/* <Outlines thickness={0.05} color="black" opacity={0.25} /> */}
    </mesh>
  )
}
