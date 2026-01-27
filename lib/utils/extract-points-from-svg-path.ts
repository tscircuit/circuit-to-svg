/**
 * Extracts coordinate points from an SVG path string using svg-path-commander.
 * Returns points for bounds calculation.
 */
import SVGPathCommander from "svg-path-commander"

interface Point {
  x: number
  y: number
}

/**
 * Extracts all relevant coordinate points from an SVG path string.
 * Returns points that should be used for bounds calculation.
 * For curves, includes both control points and endpoints.
 */
export function extractPointsFromSvgPath(svgPath: string): Point[] {
  const points: Point[] = []

  try {
    // normalizePath converts to absolute coords and expands shorthand commands
    // It normalizes H/V to L, T to Q, S to C, and converts relative to absolute
    const parsed = SVGPathCommander.normalizePath(svgPath)

    for (const segment of parsed) {
      const command = segment[0]

      switch (command) {
        case "M": // MoveTo: x, y
        case "L": // LineTo: x, y (H and V are normalized to L)
          points.push({ x: segment[1], y: segment[2] })
          break

        case "C": // Cubic bezier: x1, y1, x2, y2, x, y (S is normalized to C)
          // Include control points for bounds calculation
          points.push({ x: segment[1], y: segment[2] }) // control point 1
          points.push({ x: segment[3], y: segment[4] }) // control point 2
          points.push({ x: segment[5], y: segment[6] }) // endpoint
          break

        case "Q": // Quadratic bezier: x1, y1, x, y (T is normalized to Q)
          // Include control point for bounds calculation
          points.push({ x: segment[1], y: segment[2] }) // control point
          points.push({ x: segment[3], y: segment[4] }) // endpoint
          break

        case "A": // Arc: rx, ry, rotation, large-arc, sweep, x, y
          // Only the endpoint matters for bounds (approximation)
          points.push({ x: segment[6], y: segment[7] })
          break

        case "Z": // ClosePath - no coordinates to add
          break
      }
    }
  } catch {
    // If parsing fails, return empty array
    return []
  }

  return points
}
