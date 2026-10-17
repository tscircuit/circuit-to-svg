type Vertex = { x: number; y: number; bulge?: number }

export function getBrepRingArcBounds(vertices: readonly Vertex[]) {
  if (
    !Array.isArray(vertices) ||
    !vertices.every(
      (vertex) =>
        Number.isFinite(vertex.x) &&
        Number.isFinite(vertex.y) &&
        (vertex.bulge === undefined || Number.isFinite(vertex.bulge)),
    )
  )
    return undefined

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  const fullTurn = Math.PI * 2
  const normalize = (angle: number) =>
    ((angle % fullTurn) + fullTurn) % fullTurn

  for (const [index, start] of vertices.entries()) {
    const end = vertices[(index + 1) % vertices.length]
    const bulge = start.bulge
    if (!end || !bulge) continue

    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    if (!Number.isFinite(length) || length === 0) continue

    // bulge = tan(弧角/4)です。閉鎖辺も、描画される弧上の軸方向極値だけを加えます。
    const offset = (1 - bulge * bulge) / (4 * bulge)
    const centerX = start.x + dx / 2 - dy * offset
    const centerY = start.y + dy / 2 + dx * offset
    const radius = Math.abs((length / 4 / bulge) * (bulge * bulge + 1))
    if (
      radius <= 0 ||
      ![
        centerX - radius,
        centerX + radius,
        centerY - radius,
        centerY + radius,
      ].every(Number.isFinite)
    )
      continue

    const startAngle = Math.atan2(start.y - centerY, start.x - centerX)
    const sweep = Math.abs(4 * Math.atan(bulge))
    for (const [angle, x, y] of [
      [0, centerX + radius, centerY],
      [Math.PI / 2, centerX, centerY + radius],
      [Math.PI, centerX - radius, centerY],
      [(Math.PI * 3) / 2, centerX, centerY - radius],
    ] as const) {
      const travel = normalize(
        bulge > 0 ? angle - startAngle : startAngle - angle,
      )
      if (travel > sweep + Number.EPSILON * 16) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : undefined
}
