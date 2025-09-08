import { applyToPoint, type Matrix } from "transformation-matrix"

export function ringToPathD(
  vertices: Array<{ x: number; y: number; bulge?: number }>,
  transform: Matrix,
): string {
  if (vertices.length === 0) return ""

  const transformedVertices = vertices.map((v) => {
    const [x, y] = applyToPoint(transform, [v.x, v.y])
    return { ...v, x, y }
  })

  let d = `M ${transformedVertices[0]!.x} ${transformedVertices[0]!.y}`

  for (let i = 0; i < transformedVertices.length; i++) {
    const start = transformedVertices[i]!
    const end = transformedVertices[(i + 1) % transformedVertices.length]!

    if (start.bulge) {
      if (Math.hypot(end.x - start.x, end.y - start.y) < 1e-9) continue

      const bulge = start.bulge
      const dx = end.x - start.x
      const dy = end.y - start.y
      const dist = Math.hypot(dx, dy)

      const radius = Math.abs((dist / 4 / bulge) * (bulge * bulge + 1))
      const sweepFlag = bulge < 0 ? 0 : 1
      const largeArcFlag = Math.abs(bulge) > 1 ? 1 : 0
      d += ` A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`
    } else {
      d += ` L ${end.x} ${end.y}`
    }
  }

  d += " Z"
  return d
}
