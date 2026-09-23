import type { PcbTraceRoutePointTeardrop, Point } from "circuit-json"

// Accept the additive quadratic profile while its circuit-json release is pending.
// Remove this compatibility type after updating to the published schema.
export type RenderableTeardrop = Omit<
  PcbTraceRoutePointTeardrop,
  "width_interpolation_mode"
> & {
  width_interpolation_mode:
    | PcbTraceRoutePointTeardrop["width_interpolation_mode"]
    | "quadratic"
}

/** Tessellate full-width tapers with flat caps. No extra endpoint disks.
 * Curved-profile chord error is bounded by 1um + 1ppm of the width change.
 * The relative term bounds tessellation memory even for very large inputs.
 */
export function getTeardropPolygon(segment: RenderableTeardrop): Point[] {
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
    segment.width_interpolation_mode !== "smoothstep" &&
    segment.width_interpolation_mode !== "quadratic"
  )
    return []
  const delta = Math.abs(w1 - w0)
  // max |(width/2)''| is delta for quadratic and 3*delta for smoothstep.
  // Using the smoothstep bound for both keeps chord error bounded.
  const steps =
    segment.width_interpolation_mode === "linear"
      ? 1
      : Math.max(
          1,
          Math.ceil(Math.sqrt((delta / (0.001 + delta * 0.000001)) * (3 / 8))),
        )
  const nx = -dy / length
  const ny = dx / length
  const left: Point[] = []
  const right: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const f =
      segment.width_interpolation_mode === "linear" ? t : t * t * (3 - 2 * t)
    // Orient the quadratic from narrow to wide so reversing route order
    // preserves the shape and the tangent stays flat at the narrow end.
    const u = w0 <= w1 ? t : 1 - t
    const width =
      segment.width_interpolation_mode === "quadratic"
        ? Math.min(w0, w1) + delta * u * u
        : w0 + (w1 - w0) * f
    const halfWidth = width / 2
    const x = start.x + dx * t
    const y = start.y + dy * t
    left.push({ x: x + nx * halfWidth, y: y + ny * halfWidth })
    right.push({ x: x - nx * halfWidth, y: y - ny * halfWidth })
  }
  return [...left, ...right.reverse()]
}
