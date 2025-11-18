import type { PcbCutoutPath, Point } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

/**
 * Creates SVG objects for path-based PCB cutouts.
 *
 * Properties:
 * - route: Point[] - Array of points defining the path
 * - slot_width: Length - Width of the slot (required)
 * - slot_length?: Length - Length of individual slots for dashed pattern (optional)
 * - space_between_slots?: Length - Spacing between slots for dashed pattern (optional)
 * - slot_corner_radius?: Length - Corner radius for rounding ends / corners (optional)
 *
 * When slot_length and space_between_slots are specified, creates a dashed pattern
 * of slots that follow (bend with) the path.
 *
 * When they are omitted, creates a continuous slot along the entire path that bends
 * with the polyline.
 *
 * Note: Slots that are too small to accommodate the corner radius
 * (width or length < 2*radius) will be skipped and not rendered.
 */
export function createSvgObjectsFromPcbCutoutPath(
  cutout: PcbCutoutPath,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap } = ctx

  if (!cutout.route || cutout.route.length < 2) return []

  const scale = Math.abs(transform.a) || 1
  const scaledSlotWidth = cutout.slot_width * scale
  const cornerRadius = cutout.slot_corner_radius
    ? cutout.slot_corner_radius * scale
    : 0
  const tolerance = 0.001

  // Transform route points into SVG space
  const transformedRoute: number[][] = cutout.route.map((p: Point) =>
    applyToPoint(transform, [p.x, p.y]),
  ) as number[][]

  // Precompute segment distances and total length
  const segmentDistances: number[] = []
  let totalDistance = 0
  for (let i = 0; i < transformedRoute.length - 1; i++) {
    const dx = transformedRoute[i + 1]![0]! - transformedRoute[i]![0]!
    const dy = transformedRoute[i + 1]![1]! - transformedRoute[i]![1]!
    const dist = Math.sqrt(dx * dx + dy * dy)
    segmentDistances.push(dist)
    totalDistance += dist
  }

  const svgObjects: SvgObject[] = []

  // Helper for radius constraints
  const hasUsableRadius = (width: number, length: number) =>
    cornerRadius > 0 &&
    width >= 2 * cornerRadius - tolerance &&
    length >= 2 * cornerRadius - tolerance

  // Stroke style derived from corner radius
  const strokeLineCap =
    cornerRadius > 0 && hasUsableRadius(scaledSlotWidth, totalDistance)
      ? "round"
      : "butt"
  const strokeLineJoin =
    cornerRadius > 0 && hasUsableRadius(scaledSlotWidth, totalDistance)
      ? "round"
      : "miter"

  // -------------------------
  // Dashed pattern: slots that bend along the path
  // -------------------------
  if (
    cutout.slot_length !== undefined &&
    cutout.space_between_slots !== undefined
  ) {
    const nominalVisibleLength = cutout.slot_length * scale
    const spacing = cutout.space_between_slots * scale
    const pitch = nominalVisibleLength + spacing

    const r = cornerRadius
    const usesRoundedCaps = r > 0

    // Treat slot_length as the *visible* tip-to-tip length.
    // For rounded caps, the underlying path is shorter by 2r.
    if (
      usesRoundedCaps &&
      !hasUsableRadius(scaledSlotWidth, nominalVisibleLength)
    ) {
      return svgObjects
    }

    const minVisibleLength = Math.max(
      scaledSlotWidth,
      usesRoundedCaps ? 2 * r : 0,
      tolerance,
    )

    // 1) Build visible slot ranges along the total distance
    const visibleRanges: Array<{ start: number; end: number }> = []
    let startVisible = 0

    while (startVisible < totalDistance - minVisibleLength) {
      let endVisible = startVisible + nominalVisibleLength

      // If we can't fit a full visible slot + spacing, shrink the last slot
      if (endVisible + spacing > totalDistance + tolerance) {
        endVisible = totalDistance - spacing
        if (endVisible - startVisible < minVisibleLength - tolerance) break
      }

      visibleRanges.push({ start: startVisible, end: endVisible })

      // If that was the last one, stop
      if (endVisible + spacing > totalDistance + tolerance) break

      startVisible += pitch
    }

    // 2) Convert visible ranges to actual path ranges (trim off caps)
    const pathRanges: Array<{ start: number; end: number }> = visibleRanges.map(
      ({ start, end }) => {
        if (!usesRoundedCaps) return { start, end }

        const pathStart = start + r
        const pathEnd = end - r
        // Guard against numeric weirdness
        if (pathEnd <= pathStart + tolerance) {
          return { start, end } // fall back to square-ish if it's too tight
        }
        return { start: pathStart, end: pathEnd }
      },
    )

    // 3) Precompute distances of polyline corners (between segments)
    const cornerDistances: number[] = []
    {
      let acc = 0
      for (let i = 0; i < segmentDistances.length - 1; i++) {
        acc += segmentDistances[i]!
        cornerDistances.push(acc)
      }
    }

    // 4) Merge adjacent ranges that meet exactly at a corner
    const mergedRanges: Array<{ start: number; end: number }> = []
    const mergeEps = tolerance * 10

    for (const range of pathRanges) {
      if (mergedRanges.length > 0) {
        const prev = mergedRanges[mergedRanges.length - 1]!
        const meet = prev.end

        if (Math.abs(meet - range.start) <= mergeEps) {
          const meetsCorner = cornerDistances.some(
            (d) => Math.abs(d - meet) <= mergeEps,
          )
          if (meetsCorner) {
            prev.end = range.end
            continue
          }
        }
      }
      mergedRanges.push(range)
    }

    // 5) Render each merged range as a slot path
    for (const { start, end } of mergedRanges) {
      const slotPolyline = getSubpathBetweenDistances(
        transformedRoute,
        segmentDistances,
        start,
        end,
      )

      if (slotPolyline.length >= 2) {
        const pathData = polylineToSvgPath(slotPolyline)
        if (!pathData) continue

        svgObjects.push({
          name: "path",
          type: "element",
          attributes: {
            class: "pcb-cutout pcb-cutout-path-slot",
            d: pathData,
            stroke: colorMap.drill,
            "stroke-width": scaledSlotWidth.toString(),
            "stroke-linecap": usesRoundedCaps ? "round" : "butt",
            "stroke-linejoin": usesRoundedCaps ? "round" : "miter",
            fill: "none",
            "data-type": "pcb_cutout",
            "data-pcb-layer": "drill",
          },
          children: [],
          value: "",
        })
      }
    }

    return svgObjects
  }

  // -------------------------
  // Continuous slot that bends with the path
  // -------------------------

  if (cornerRadius > 0 && !hasUsableRadius(scaledSlotWidth, totalDistance)) {
    return svgObjects
  }

  const continuousPathData = polylineToSvgPath(transformedRoute)

  if (continuousPathData) {
    svgObjects.push({
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-cutout pcb-cutout-path-segment",
        d: continuousPathData,
        stroke: colorMap.drill,
        "stroke-width": scaledSlotWidth.toString(),
        "stroke-linecap": strokeLineCap,
        "stroke-linejoin": strokeLineJoin,
        fill: "none",
        "data-type": "pcb_cutout",
        "data-pcb-layer": "drill",
      },
      children: [],
      value: "",
    })
  }

  return svgObjects
}

/**
 * Convert a polyline to an SVG "M/L" path string.
 * (No sampling / epsilon tricks here.)
 */
function polylineToSvgPath(points: number[][]): string {
  if (points.length < 2) return ""
  const [x0, y0] = points[0]!
  let d = `M${x0},${y0}`
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]!
    d += ` L${x},${y}`
  }
  return d
}

/**
 * Get a point at a specific distance along a polyline.
 */
function getPointAtDistance(
  points: number[][],
  segmentDistances: number[],
  targetDistance: number,
): number[] | null {
  if (points.length === 0) return null

  let currentDist = 0
  for (let i = 0; i < segmentDistances.length; i++) {
    const segmentDist = segmentDistances[i]!
    if (currentDist + segmentDist >= targetDistance) {
      const t =
        segmentDist === 0 ? 0 : (targetDistance - currentDist) / segmentDist
      return [
        points[i]![0]! + t * (points[i + 1]![0]! - points[i]![0]!),
        points[i]![1]! + t * (points[i + 1]![1]! - points[i]![1]!),
      ]
    }
    currentDist += segmentDist
  }

  return points[points.length - 1] ?? null
}

/**
 * Helper: get a polyline subpath between two distances along the full polyline.
 * The returned points follow the original path and will "bend" through corners.
 */
function getSubpathBetweenDistances(
  points: number[][],
  segmentDistances: number[],
  startDistance: number,
  endDistance: number,
): number[][] {
  const result: number[][] = []
  if (!points.length) return result

  const totalDistance = segmentDistances.reduce((a, b) => a + b, 0)
  const s = Math.max(0, Math.min(startDistance, totalDistance))
  const e = Math.max(s, Math.min(endDistance, totalDistance))

  if (e <= 0) {
    result.push(points[0]!)
    return result
  }

  let currentDist = 0
  for (let i = 0; i < segmentDistances.length; i++) {
    const segLen = segmentDistances[i]!
    const p0 = points[i]!
    const p1 = points[i + 1]!

    const segStart = currentDist
    const segEnd = currentDist + segLen

    if (segEnd <= s) {
      currentDist += segLen
      continue
    }

    if (segStart >= e) {
      break
    }

    const localStart = Math.max(s, segStart)
    const localEnd = Math.min(e, segEnd)

    const t0 = segLen === 0 ? 0 : (localStart - segStart) / segLen
    const t1 = segLen === 0 ? 0 : (localEnd - segStart) / segLen

    const startPoint: number[] = [
      p0[0]! + (p1[0]! - p0[0]!) * t0,
      p0[1]! + (p1[1]! - p0[1]!) * t0,
    ]
    const endPoint: number[] = [
      p0[0]! + (p1[0]! - p0[0]!) * t1,
      p0[1]! + (p1[1]! - p0[1]!) * t1,
    ]

    if (result.length === 0) {
      result.push(startPoint)
    } else {
      const last = result[result.length - 1]!
      if (last[0] !== startPoint[0] || last[1] !== startPoint[1]) {
        result.push(startPoint)
      }
    }

    result.push(endPoint)

    currentDist += segLen
  }

  return result
}
