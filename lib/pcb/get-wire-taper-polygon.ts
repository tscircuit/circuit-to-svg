import type { PcbTraceRoutePointWire, Point, LayerRef } from "circuit-json"

// Wire extension awaiting the next circuit-json release; ordinary wires remain compatible.
export type TaperedWirePoint = PcbTraceRoutePointWire & {
  start_width: number
  end_width: number
  width_interpolation_mode: "linear" | "quadratic"
}
export interface WireTaperSegment {
  start: Point
  end: Point
  start_width: number
  end_width: number
  width_interpolation_mode: "linear" | "quadratic"
  layer: LayerRef
  is_inside_copper_pour?: boolean
}

/** Presence check also catches malformed partial tapers, preventing a fallback stroke. */
export function hasWireTaper(point: unknown): point is TaperedWirePoint {
  if (!point || typeof point !== "object") return false
  return (
    "route_type" in point &&
    point.route_type === "wire" &&
    ("start_width" in point ||
      "end_width" in point ||
      "width_interpolation_mode" in point)
  )
}

/** A taper belongs only to the outgoing segment of its wire point. */
export function getWireTaperSegments(
  route: readonly unknown[],
): WireTaperSegment[] {
  const result: WireTaperSegment[] = []
  for (let i = 0; i < route.length - 1; i++) {
    const point = route[i]
    if (!hasWireTaper(point)) continue
    const next = route[i + 1] as
      | {
          route_type?: string
          x?: number
          y?: number
          layer?: LayerRef
          from_layer?: LayerRef
          start_layer?: LayerRef
          is_inside_copper_pour?: boolean
          start?: Point
        }
      | undefined
    if (!next) continue
    const end =
      next.route_type === "through_pad"
        ? next.start
        : { x: next.x!, y: next.y! }
    const layer =
      next.route_type === "via"
        ? next.from_layer
        : next.route_type === "through_pad"
          ? next.start_layer
          : next.layer
    if (!end || layer !== point.layer || point.width !== point.start_width)
      continue
    const segment: WireTaperSegment = {
      start: { x: point.x, y: point.y },
      end,
      start_width: point.start_width,
      end_width: point.end_width,
      width_interpolation_mode: point.width_interpolation_mode,
      layer: point.layer,
      is_inside_copper_pour: Boolean(
        point.is_inside_copper_pour && next.is_inside_copper_pour,
      ),
    }
    if (isValidWireTaperSegment(segment)) result.push(segment)
  }
  return result
}

/** Tessellate full-width tapers with flat caps. No extra endpoint disks.
 * Curved-profile chord error is bounded by 1um + 1ppm of the width change.
 * The relative term bounds tessellation memory even for very large inputs.
 */
export function getWireTaperPolygon(segment: WireTaperSegment): Point[] {
  const { start, end, start_width: w0, end_width: w1 } = segment
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (!isValidWireTaperSegment(segment)) return []
  const delta = Math.abs(w1 - w0)
  // max |(width/2)''| is delta for quadratic.
  // Chord error <= delta/(8*n*n); keep a factor-of-three safety margin.
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
    // Orient the quadratic from narrow to wide so reversing route order
    // preserves the shape and the tangent stays flat at the narrow end.
    const u = w0 <= w1 ? t : 1 - t
    const width =
      segment.width_interpolation_mode === "quadratic"
        ? Math.min(w0, w1) + delta * u * u
        : w0 + (w1 - w0) * t
    const halfWidth = width / 2
    const x = start.x + dx * t
    const y = start.y + dy * t
    left.push({ x: x + nx * halfWidth, y: y + ny * halfWidth })
    right.push({ x: x - nx * halfWidth, y: y - ny * halfWidth })
  }
  return [...left, ...right.reverse()]
}

function isValidWireTaperSegment(segment: WireTaperSegment): boolean {
  const { start, end, start_width: w0, end_width: w1 } = segment
  const length = Math.hypot(end.x - start.x, end.y - start.y)
  if (
    ![start.x, start.y, end.x, end.y, length, w0, w1].every(Number.isFinite) ||
    length <= 0 ||
    w0 <= 0 ||
    w1 <= 0
  )
    return false
  if (
    segment.width_interpolation_mode !== "linear" &&
    segment.width_interpolation_mode !== "quadratic"
  )
    return false
  return true
}
