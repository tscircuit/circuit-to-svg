/**
 * Returns a function rotating a point (relative to a plated hole position) by
 * the hole's ccw_rotation in degrees. Used for `hole_with_polygon_pad`, whose
 * pad_outline and hole offset are stored unrotated and relative to (x, y).
 */
export const getPolygonPadRotator = (ccwRotationDegrees?: number) => {
  const rotation = ((ccwRotationDegrees ?? 0) * Math.PI) / 180
  if (rotation === 0) return (point: { x: number; y: number }) => point
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return (point: { x: number; y: number }) => ({
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  })
}
