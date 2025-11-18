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
 * - slot_corner_radius?: Length - Corner radius for rounding the four corners of each slot (optional)
 *
 * When slot_length and space_between_slots are specified, creates a dashed pattern of slots.
 * When they are omitted, creates a continuous slot along the entire path.
 * The slot_corner_radius rounds the four corners of the rectangular slot (0 = square corners).
 *
 * Note: Slots that are too small to accommodate the corner radius (width or length < 2*radius)
 * will be skipped and not rendered.
 */
export function createSvgObjectsFromPcbCutoutPath(
  cutout: PcbCutoutPath,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap } = ctx

  if (!cutout.route || cutout.route.length < 2) return []

  const scaledSlotWidth = cutout.slot_width * Math.abs(transform.a)
  const cornerRadius = cutout.slot_corner_radius
    ? cutout.slot_corner_radius * Math.abs(transform.a)
    : 0

  // Transform route points
  const transformedRoute = cutout.route.map((p: Point) =>
    applyToPoint(transform, [p.x, p.y]),
  )

  // Helper function to create a pill/slot shape along a line segment
  const createSlotPath = (
    start: number[],
    end: number[],
    width: number,
    radius: number,
    requiredWidth: number,
    requiredLength: number,
  ): string => {
    const dx = end[0]! - start[0]!
    const dy = end[1]! - start[1]!
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length === 0) return ""

    // Don't render if the slot doesn't have the full required dimensions
    // This ensures we only render complete slots with proper width and length
    // Use a small tolerance (0.001mm) to account for floating point precision
    const tolerance = 0.001

    if (requiredLength > 0 && length < requiredLength - tolerance) {
      return "" // Skip - slot segment is too short
    }

    if (width < requiredWidth - tolerance) {
      return "" // Skip - slot is too narrow
    }

    // Additional check: Don't render if the slot is too small to fit the corner radius
    // Need at least 2*radius in both length and width for rounded corners to work
    if (radius > 0) {
      const minLength = 2 * radius
      const minWidth = 2 * radius
      if (length < minLength || width < minWidth) {
        return "" // Skip this slot - it's too small for the corner radius
      }
    }

    // Unit vector along the line
    const ux = dx / length
    const uy = dy / length

    // Perpendicular unit vector
    const px = -uy
    const py = ux

    // Half width offset
    const hw = width / 2

    // Corner points of the rectangle (going clockwise from top-left)
    // p1 = start + perpendicular (top-left when looking along the path)
    // p2 = start - perpendicular (bottom-left)
    // p3 = end - perpendicular (bottom-right)
    // p4 = end + perpendicular (top-right)
    const p1 = [start[0]! + px * hw, start[1]! + py * hw]
    const p2 = [start[0]! - px * hw, start[1]! - py * hw]
    const p3 = [end[0]! - px * hw, end[1]! - py * hw]
    const p4 = [end[0]! + px * hw, end[1]! + py * hw]

    if (radius === 0 || radius < 0.001) {
      // Square corners
      return `M${p1[0]},${p1[1]} L${p4[0]},${p4[1]} L${p3[0]},${p3[1]} L${p2[0]},${p2[1]} Z`
    }

    // Rounded corners - limit radius to half the width or half the length
    const r = Math.min(radius, hw, length / 2)

    // Create a rounded rectangle with OUTWARD curving corners
    // Key insight: corners should bulge AWAY from the shape, not toward it
    // Path goes: p1 -> p4 -> p3 -> p2 -> back to p1 (clockwise around the slot)

    return (
      // Start on top edge, offset from p1 toward p4 by radius amount
      `M${p1[0]! + ux * r},${p1[1]! + uy * r} ` +
      // Line along top edge toward p4
      `L${p4[0]! - ux * r},${p4[1]! - uy * r} ` +
      // Arc around p4 corner (top-right) - curving OUTWARD from the slot
      // Transition from moving along +ux direction to moving along -px direction
      `Q${p4[0]!},${p4[1]!} ${p4[0]! - px * r},${p4[1]! - py * r} ` +
      // Line along right edge toward p3
      `L${p3[0]! + px * r},${p3[1]! + py * r} ` +
      // Arc around p3 corner (bottom-right) - curving OUTWARD
      `Q${p3[0]!},${p3[1]!} ${p3[0]! - ux * r},${p3[1]! - uy * r} ` +
      // Line along bottom edge toward p2
      `L${p2[0]! + ux * r},${p2[1]! + uy * r} ` +
      // Arc around p2 corner (bottom-left) - curving OUTWARD
      `Q${p2[0]!},${p2[1]!} ${p2[0]! + px * r},${p2[1]! + py * r} ` +
      // Line along left edge back toward p1
      `L${p1[0]! - px * r},${p1[1]! - py * r} ` +
      // Arc around p1 corner (top-left) - curving OUTWARD back to start
      `Q${p1[0]!},${p1[1]!} ${p1[0]! + ux * r},${p1[1]! + uy * r} Z`
    )
  }

  const svgObjects: SvgObject[] = []

  if (
    cutout.slot_length !== undefined &&
    cutout.space_between_slots !== undefined
  ) {
    // Dashed pattern: create individual slots
    const scaledSlotLength = cutout.slot_length * Math.abs(transform.a)
    const scaledSpacing = cutout.space_between_slots * Math.abs(transform.a)
    const slotPitch = scaledSlotLength + scaledSpacing

    let totalDistance = 0
    const segmentDistances: number[] = []
    for (let i = 0; i < transformedRoute.length - 1; i++) {
      const dx = transformedRoute[i + 1]![0]! - transformedRoute[i]![0]!
      const dy = transformedRoute[i + 1]![1]! - transformedRoute[i]![1]!
      const dist = Math.sqrt(dx * dx + dy * dy)
      segmentDistances.push(dist)
      totalDistance += dist
    }

    // Generate slots along the path
    let slotStart = 0

    while (slotStart < totalDistance) {
      const slotEnd = slotStart + scaledSlotLength

      // Skip this slot if it would extend beyond the path
      // We only want complete slots with the full specified length
      if (slotEnd > totalDistance) {
        break // Stop creating slots - not enough room for a full slot
      }

      // Find points for this slot
      const startPoint = getPointAtDistance(
        transformedRoute,
        segmentDistances,
        slotStart,
      )
      const endPoint = getPointAtDistance(
        transformedRoute,
        segmentDistances,
        slotEnd,
      )

      if (startPoint && endPoint) {
        const pathData = createSlotPath(
          startPoint,
          endPoint,
          scaledSlotWidth,
          cornerRadius,
          cutout.slot_width * Math.abs(transform.a), // Required width
          scaledSlotLength, // Required length
        )
        if (pathData) {
          svgObjects.push({
            name: "path",
            type: "element",
            attributes: {
              class: "pcb-cutout pcb-cutout-path-slot",
              d: pathData,
              fill: colorMap.drill,
              "data-type": "pcb_cutout",
              "data-pcb-layer": "drill",
            },
            children: [],
            value: "",
          })
        }
      }

      slotStart += slotPitch
    }
  } else {
    // Continuous slot: create one path for each segment
    for (let i = 0; i < transformedRoute.length - 1; i++) {
      const pathData = createSlotPath(
        transformedRoute[i]!,
        transformedRoute[i + 1]!,
        scaledSlotWidth,
        cornerRadius,
        cutout.slot_width * Math.abs(transform.a), // Required width
        0, // No minimum length requirement for continuous slots
      )
      if (pathData) {
        svgObjects.push({
          name: "path",
          type: "element",
          attributes: {
            class: "pcb-cutout pcb-cutout-path-segment",
            d: pathData,
            fill: colorMap.drill,
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

/**
 * Helper function to get a point at a specific distance along a polyline
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
      const t = (targetDistance - currentDist) / segmentDist
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
