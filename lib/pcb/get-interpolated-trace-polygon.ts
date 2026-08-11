export interface InterpolatedTracePoint {
  x: number
  y: number
  width: number
}

export function getInterpolatedTracePolygon(
  points: InterpolatedTracePoint[],
): Array<{ x: number; y: number }> {
  const left: Array<{ x: number; y: number }> = []
  const right: Array<{ x: number; y: number }> = []

  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    if (!point) continue
    const direction = getTraceDirectionAt(points, index)
    const normal = normalize(-direction.y, direction.x)
    const offset = point.width / 2

    left.push({
      x: point.x + normal.x * offset,
      y: point.y + normal.y * offset,
    })
    right.push({
      x: point.x - normal.x * offset,
      y: point.y - normal.y * offset,
    })
  }

  return left.concat(right.reverse())
}

function getTraceDirectionAt(
  points: InterpolatedTracePoint[],
  index: number,
): { x: number; y: number } {
  if (points.length < 2) return { x: 1, y: 0 }

  if (index <= 0) {
    return getDirection(points[0], points[1])
  }

  if (index >= points.length - 1) {
    return getDirection(points[points.length - 2], points[points.length - 1])
  }

  const previousDirection = getDirection(points[index - 1], points[index])
  const nextDirection = getDirection(points[index], points[index + 1])
  const averagedDirection = normalize(
    previousDirection.x + nextDirection.x,
    previousDirection.y + nextDirection.y,
  )

  if (averagedDirection.x !== 0 || averagedDirection.y !== 0) {
    return averagedDirection
  }
  if (previousDirection.x !== 0 || previousDirection.y !== 0) {
    return previousDirection
  }
  if (nextDirection.x !== 0 || nextDirection.y !== 0) {
    return nextDirection
  }
  return { x: 1, y: 0 }
}

function getDirection(
  start: InterpolatedTracePoint | undefined,
  end: InterpolatedTracePoint | undefined,
): { x: number; y: number } {
  if (!start || !end) return { x: 1, y: 0 }
  const direction = normalize(end.x - start.x, end.y - start.y)
  return direction.x === 0 && direction.y === 0 ? { x: 1, y: 0 } : direction
}

function normalize(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y)
  if (length <= Number.EPSILON) return { x: 0, y: 0 }
  return { x: x / length, y: y / length }
}
