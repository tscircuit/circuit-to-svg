/**
 * Extracts coordinate points from an SVG path string.
 * Handles all standard SVG path commands with their correct parameter counts.
 *
 * SVG Path Commands:
 * - M/m (moveto): 2 params (x, y)
 * - L/l (lineto): 2 params (x, y)
 * - H/h (horizontal lineto): 1 param (x)
 * - V/v (vertical lineto): 1 param (y)
 * - C/c (cubic bezier): 6 params (x1, y1, x2, y2, x, y)
 * - S/s (smooth cubic): 4 params (x2, y2, x, y)
 * - Q/q (quadratic bezier): 4 params (x1, y1, x, y)
 * - T/t (smooth quadratic): 2 params (x, y)
 * - A/a (arc): 7 params (rx, ry, x-rotation, large-arc, sweep, x, y)
 * - Z/z (closepath): 0 params
 */

interface Point {
  x: number
  y: number
}

// Number of coordinate values each command consumes
const COMMAND_PARAM_COUNTS: Record<string, number> = {
  M: 2,
  m: 2,
  L: 2,
  l: 2,
  H: 1,
  h: 1,
  V: 1,
  v: 1,
  C: 6,
  c: 6,
  S: 4,
  s: 4,
  Q: 4,
  q: 4,
  T: 2,
  t: 2,
  A: 7,
  a: 7,
  Z: 0,
  z: 0,
}

/**
 * Extracts all relevant coordinate points from an SVG path string.
 * Returns points that should be used for bounds calculation.
 * For curves, includes both control points and endpoints.
 */
export function extractPointsFromSvgPath(svgPath: string): Point[] {
  const points: Point[] = []
  let currentX = 0
  let currentY = 0
  let startX = 0
  let startY = 0

  // Tokenize the path: split into commands and numbers
  // This regex matches command letters and numbers (including negative and decimal)
  const tokens = svgPath.match(/[MmLlHhVvCcSsQqTtAaZz]|-?[\d.]+/g)

  if (!tokens) return points

  let i = 0
  let currentCommand = ""

  while (i < tokens.length) {
    const token = tokens[i]

    // Check if it's a command letter
    if (token !== undefined && /^[MmLlHhVvCcSsQqTtAaZz]$/.test(token)) {
      currentCommand = token
      i++
    }

    // If no command yet, skip
    if (!currentCommand) {
      i++
      continue
    }

    const paramCount = COMMAND_PARAM_COUNTS[currentCommand]
    if (paramCount === undefined) {
      // Unknown command, skip
      currentCommand = ""
      continue
    }
    const isRelative = currentCommand === currentCommand.toLowerCase()
    const cmd = currentCommand.toUpperCase()

    // Handle Z (closepath) - no parameters
    if (cmd === "Z") {
      currentX = startX
      currentY = startY
      points.push({ x: currentX, y: currentY })
      currentCommand = "" // Z doesn't repeat
      continue
    }

    // Collect parameters for this command
    const params: number[] = []
    for (let j = 0; j < paramCount && i < tokens.length; j++) {
      const numToken = tokens[i]
      if (numToken !== undefined && /^-?[\d.]+$/.test(numToken)) {
        params.push(parseFloat(numToken))
        i++
      } else {
        break
      }
    }

    // If we didn't get enough parameters, stop processing
    if (params.length < paramCount) {
      break
    }

    // Process the command
    switch (cmd) {
      case "M": {
        // MoveTo
        const x = isRelative ? currentX + params[0]! : params[0]!
        const y = isRelative ? currentY + params[1]! : params[1]!
        currentX = x
        currentY = y
        startX = x
        startY = y
        points.push({ x, y })
        // Subsequent coordinates after M are treated as L
        if (isRelative) {
          currentCommand = "l"
        } else {
          currentCommand = "L"
        }
        break
      }
      case "L": {
        // LineTo
        const x = isRelative ? currentX + params[0]! : params[0]!
        const y = isRelative ? currentY + params[1]! : params[1]!
        currentX = x
        currentY = y
        points.push({ x, y })
        break
      }
      case "H": {
        // Horizontal LineTo
        const x = isRelative ? currentX + params[0]! : params[0]!
        currentX = x
        points.push({ x: currentX, y: currentY })
        break
      }
      case "V": {
        // Vertical LineTo
        const y = isRelative ? currentY + params[0]! : params[0]!
        currentY = y
        points.push({ x: currentX, y: currentY })
        break
      }
      case "C": {
        // Cubic Bezier: x1 y1 x2 y2 x y
        const x1 = isRelative ? currentX + params[0]! : params[0]!
        const y1 = isRelative ? currentY + params[1]! : params[1]!
        const x2 = isRelative ? currentX + params[2]! : params[2]!
        const y2 = isRelative ? currentY + params[3]! : params[3]!
        const x = isRelative ? currentX + params[4]! : params[4]!
        const y = isRelative ? currentY + params[5]! : params[5]!
        // Include control points for bounds calculation
        points.push({ x: x1, y: y1 })
        points.push({ x: x2, y: y2 })
        points.push({ x, y })
        currentX = x
        currentY = y
        break
      }
      case "S": {
        // Smooth Cubic Bezier: x2 y2 x y
        const x2 = isRelative ? currentX + params[0]! : params[0]!
        const y2 = isRelative ? currentY + params[1]! : params[1]!
        const x = isRelative ? currentX + params[2]! : params[2]!
        const y = isRelative ? currentY + params[3]! : params[3]!
        // Include control point for bounds calculation
        points.push({ x: x2, y: y2 })
        points.push({ x, y })
        currentX = x
        currentY = y
        break
      }
      case "Q": {
        // Quadratic Bezier: x1 y1 x y
        const x1 = isRelative ? currentX + params[0]! : params[0]!
        const y1 = isRelative ? currentY + params[1]! : params[1]!
        const x = isRelative ? currentX + params[2]! : params[2]!
        const y = isRelative ? currentY + params[3]! : params[3]!
        // Include control point for bounds calculation
        points.push({ x: x1, y: y1 })
        points.push({ x, y })
        currentX = x
        currentY = y
        break
      }
      case "T": {
        // Smooth Quadratic Bezier: x y
        const x = isRelative ? currentX + params[0]! : params[0]!
        const y = isRelative ? currentY + params[1]! : params[1]!
        points.push({ x, y })
        currentX = x
        currentY = y
        break
      }
      case "A": {
        // Arc: rx ry x-rotation large-arc sweep x y
        // Only the endpoint (x, y) is relevant for bounds
        // The arc may extend beyond but we approximate with just the endpoint
        const x = isRelative ? currentX + params[5]! : params[5]!
        const y = isRelative ? currentY + params[6]! : params[6]!
        points.push({ x, y })
        currentX = x
        currentY = y
        break
      }
    }
  }

  return points
}
