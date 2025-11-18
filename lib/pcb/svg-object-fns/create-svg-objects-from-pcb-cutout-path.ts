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
    // Dashed pattern: create individual slots that bend with the path,
    // with uniform spacing and a shortened final slot if needed.
    //
    // IMPORTANT:
    // - cutout.slot_length is treated as the *visible* slot length
    //   (tip-to-tip including rounded ends if present)
    // - when slot_corner_radius > 0 we shorten the path segment by 2r
    //   so the final visible length stays equal to slot_length.
    const nominalSlotLength = cutout.slot_length * scale // visible length
    const scaledSpacing = cutout.space_between_slots * scale
    const slotPitch = nominalSlotLength + scaledSpacing

    const r = cornerRadius
    const usesRoundedCaps = r > 0

    // If radius is specified but slots are too small to honor it, skip everything
    if (
      usesRoundedCaps &&
      !hasUsableRadius(scaledSlotWidth, nominalSlotLength)
    ) {
      return svgObjects
    }

    // Minimum *visible* slot length we allow (respect width + radius)
    const minSlotLengthForRadius = usesRoundedCaps ? 2 * r : 0
    const minVisibleSlotLength = Math.max(
      scaledSlotWidth,
      minSlotLengthForRadius,
      tolerance,
    )

    // 1) Generate raw slot ranges along the polyline (in *path* distance space)
    const slotRanges: Array<{ start: number; end: number }> = []
    let slotStartVisible = 0 // this is the visible start distance of the slot

    while (slotStartVisible < totalDistance - minVisibleSlotLength) {
      // Can we fit a *full* visible slot here AND still leave a spacing after it
      // before we hit totalDistance?
      const canFitFullWithGap =
        slotStartVisible + nominalSlotLength + scaledSpacing <=
        totalDistance + tolerance

      let visibleLength: number

      if (canFitFullWithGap) {
        // Normal full-length slot (visible)
        visibleLength = nominalSlotLength
      } else {
        // This is the last slot: we shrink its VISIBLE length so that the gap from
        // its end to the end of the path is exactly `scaledSpacing`.
        const desiredVisibleEnd = totalDistance - scaledSpacing
        visibleLength = desiredVisibleEnd - slotStartVisible

        // If we can't fit a usable slot here, stop.
        if (visibleLength < minVisibleSlotLength - tolerance) break
      }

      // Convert visible length to actual *path* length.
      // Round caps extend r past each end, so:
      //   visibleLength = pathLength + 2r  =>  pathLength = visibleLength - 2r
      const pathLength = usesRoundedCaps
        ? Math.max(visibleLength - 2 * r, tolerance)
        : visibleLength

      // For round caps, we keep the visible start at `slotStartVisible`,
      // so the underlying path starts at slotStartVisible + r and ends at
      // slotStartVisible + r + pathLength.
      const pathStart = usesRoundedCaps
        ? slotStartVisible + r
        : slotStartVisible
      const pathEnd = pathStart + pathLength

      slotRanges.push({ start: pathStart, end: pathEnd })

      if (!canFitFullWithGap) {
        // We just placed the final shortened slot; no more room for others.
        break
      }

      // Advance to the next slot's *visible* start position with fixed spacing
      slotStartVisible += slotPitch
    }

    // 2) Precompute distances at each "corner" (polyline vertices between segments)
    const cornerDistances: number[] = []
    {
      let acc = 0
      // corners are at the end of each segment except the very last one
      for (let i = 0; i < segmentDistances.length - 1; i++) {
        acc += segmentDistances[i]!
        cornerDistances.push(acc)
      }
    }

    // 3) Merge slots that meet exactly at a corner to avoid visual blobs
    const mergedRanges: Array<{ start: number; end: number }> = []
    const mergeEps = tolerance * 10 // slightly looser than tolerance for robustness

    for (const range of slotRanges) {
      if (mergedRanges.length > 0) {
        const prev = mergedRanges[mergedRanges.length - 1]!
        const meetDist = prev.end

        // They meet (end of previous == start of current) within epsilon
        if (Math.abs(meetDist - range.start) <= mergeEps) {
          // Check if this meeting point lies on a corner
          const isAtCorner = cornerDistances.some(
            (c) => Math.abs(c - meetDist) <= mergeEps,
          )

          if (isAtCorner) {
            // Merge into a single bent slot through the corner
            prev.end = range.end
            continue
          }
        }
      }

      mergedRanges.push({ ...range })
    }

    // 4) Actually render the (possibly merged) slots
    for (const { start, end } of mergedRanges) {
      const slotPolyline = getSubpathBetweenDistances(
        transformedRoute,
        segmentDistances,
        start,
        end,
      )

      if (slotPolyline.length >= 2) {
        const pathData = polylineToSvgPath(slotPolyline)
        if (pathData) {
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
    }

    return svgObjects
  }

  // -------------------------
  // Continuous slot that bends with the path
  // -------------------------

  // If radius requested but overall slot too short or narrow to honor it, skip rendering
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
 */
function polylineToSvgPath(points: number[][]): string {
  if (!points.length) return ""

  const epsilon = 1e-6

  // Deduplicate consecutive points that are extremely close
  const filtered: number[][] = []
  for (const p of points) {
    if (!filtered.length) {
      filtered.push(p)
      continue
    }
    const last = filtered[filtered.length - 1]!
    const dx = p[0]! - last[0]!
    const dy = p[1]! - last[1]!
    if (dx * dx + dy * dy > epsilon * epsilon) {
      filtered.push(p)
    }
  }

  if (filtered.length < 2) return ""

  const [x0, y0] = filtered[0]!
  let d = `M${x0},${y0}`

  for (let i = 1; i < filtered.length; i++) {
    const [x, y] = filtered[i]!
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
      // The target point is on this segment
      const t =
        segmentDist === 0 ? 0 : (targetDistance - currentDist) / segmentDist
      return [
        points[i]![0]! + t * (points[i + 1]![0]! - points[i]![0]!),
        points[i]![1]! + t * (points[i + 1]![1]! - points[i]![1]!),
      ]
    }
    currentDist += segmentDist
  }

  // If we get here, return the last point
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

  // Clamp distances
  const totalDistance = segmentDistances.reduce((a, b) => a + b, 0)
  const s = Math.max(0, Math.min(startDistance, totalDistance))
  const e = Math.max(s, Math.min(endDistance, totalDistance))

  if (e <= 0) {
    // Entire subpath is before the first point; return at least the start
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

    // Segment completely before the subpath
    if (segEnd <= s) {
      currentDist += segLen
      continue
    }

    // Segment completely after the subpath
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

    // Add startPoint if this is the first segment or it doesn't duplicate the last point
    if (result.length === 0) {
      result.push(startPoint)
    } else {
      const last = result[result.length - 1]!
      if (
        Math.abs(last[0]! - startPoint[0]!) > 1e-9 ||
        Math.abs(last[1]! - startPoint[1]!) > 1e-9
      ) {
        result.push(startPoint)
      }
    }

    result.push(endPoint)

    currentDist += segLen
  }

  return result
}
