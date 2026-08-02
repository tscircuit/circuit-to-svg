export type PolygonPoint = { x: number; y: number }

const getSignedPolygonArea = (points: PolygonPoint[]) =>
  points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length]!
    return area + point.x * next.y - next.x * point.y
  }, 0) / 2

const getLineIntersection = (
  lineA: { start: PolygonPoint; end: PolygonPoint },
  lineB: { start: PolygonPoint; end: PolygonPoint },
): PolygonPoint | null => {
  const ax = lineA.end.x - lineA.start.x
  const ay = lineA.end.y - lineA.start.y
  const bx = lineB.end.x - lineB.start.x
  const by = lineB.end.y - lineB.start.y
  const denominator = ax * by - ay * bx
  if (Math.abs(denominator) < 1e-9) return null

  const cx = lineB.start.x - lineA.start.x
  const cy = lineB.start.y - lineA.start.y
  const t = (cx * by - cy * bx) / denominator
  return { x: lineA.start.x + ax * t, y: lineA.start.y + ay * t }
}

export const offsetPolygonOutline = (
  points: PolygonPoint[],
  offset: number,
): PolygonPoint[] => {
  if (points.length < 3 || offset === 0) return points

  const isCounterClockwise = getSignedPolygonArea(points) > 0
  const shiftedEdges = points.flatMap((start, index) => {
    const end = points[(index + 1) % points.length]!
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length < 1e-9) return []

    const normalX = (isCounterClockwise ? dy : -dy) / length
    const normalY = (isCounterClockwise ? -dx : dx) / length
    return [
      {
        start: {
          x: start.x + normalX * offset,
          y: start.y + normalY * offset,
        },
        end: {
          x: end.x + normalX * offset,
          y: end.y + normalY * offset,
        },
      },
    ]
  })

  if (shiftedEdges.length < 3) return points

  return shiftedEdges.map((currentEdge, index) => {
    const previousEdge =
      shiftedEdges[(index - 1 + shiftedEdges.length) % shiftedEdges.length]!
    return getLineIntersection(previousEdge, currentEdge) ?? currentEdge.start
  })
}
