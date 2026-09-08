/**
 * Rotates a point counterclockwise around the origin by the given angle in
 * degrees. Used for pad geometry that is stored relative to a pad center and
 * rotated by a `ccw_rotation` field in circuit coordinates.
 */
export const rotatePointCcwDeg = (
  x: number,
  y: number,
  ccwRotationDegrees: number,
): { x: number; y: number } => {
  const rad = (ccwRotationDegrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}
