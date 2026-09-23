import type { PcbTraceRoutePointTeardrop, Point } from "circuit-json"

/** Tessellate full-width tapers with flat caps. No extra endpoint disks.
 * Smoothstep chord error is bounded by 1um + 1ppm of the width change.
 * The relative term bounds tessellation memory even for very large inputs.
 */
export function getTeardropPolygon(
  segment: PcbTraceRoutePointTeardrop,
): Point[] {
  const { start, end, start_width: w0, end_width: w1 } = segment
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (
    ![start.x, start.y, end.x, end.y, length, w0, w1].every(Number.isFinite) ||
    length <= 0 ||
    w0 <= 0 ||
    w1 <= 0
  )
    return []
  if (
    segment.width_interpolation_mode !== "linear" &&
    segment.width_interpolation_mode !== "smoothstep"
  )
    return []
  const delta = Math.abs(w1 - w0)
  // max |(width/2)''| = 3*delta; chord error <= max|f''|/(8*n*n).
  const steps =
    segment.width_interpolation_mode === "linear"
      ? 1
      : Math.max(
          1,
          Math.ceil(Math.sqrt((3 * delta) / (8 * (0.001 + delta * 0.000001)))),
        )
  const nx = -dy / length
  const ny = dx / length
  const left: Point[] = []
  const right: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const f =
      segment.width_interpolation_mode === "linear" ? t : t * t * (3 - 2 * t)
    const halfWidth = (w0 + (w1 - w0) * f) / 2
    const x = start.x + dx * t
    const y = start.y + dy * t
    left.push({ x: x + nx * halfWidth, y: y + ny * halfWidth })
    right.push({ x: x - nx * halfWidth, y: y - ny * halfWidth })
  }
  return [...left, ...right.reverse()]
}
