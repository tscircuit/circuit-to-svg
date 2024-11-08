import type { SchematicTrace } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { applyToPoint, type Matrix } from "transformation-matrix"

export function createSchematicTrace(
  trace: SchematicTrace,
  transform: Matrix,
): SvgObject[] {
  const edges = trace.edges
  if (edges.length === 0) return []

  let path = ""

  // Process all edges
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
    const edge = edges[edgeIndex]!

    // Transform the points using the matrix
    const [screenFromX, screenFromY] = applyToPoint(transform, [
      edge.from.x,
      edge.from.y,
    ])
    const [screenToX, screenToY] = applyToPoint(transform, [
      edge.to.x,
      edge.to.y,
    ])

    if (edge.is_crossing) {
      // For crossing traces, create a small arc/hop
      const midX = (screenFromX + screenToX) / 2
      const midY = (screenFromY + screenToY) / 2

      // Calculate perpendicular offset for the arc
      const dx = screenToX - screenFromX
      const dy = screenToY - screenFromY
      const len = Math.sqrt(dx * dx + dy * dy)
      const hopHeight = len * 0.7

      // Perpendicular vector
      const perpX = (-dy / len) * hopHeight
      const perpY = (dx / len) * hopHeight

      // Control point for the quadratic curve
      const controlX = midX + perpX
      const controlY = midY - Math.abs(perpY)

      // Build the path string with a quadratic curve for the hop
      if (edgeIndex === 0) {
        path += `M ${screenFromX} ${screenFromY} Q ${controlX} ${controlY} ${screenToX} ${screenToY}`
      } else {
        path += ` Q ${controlX} ${controlY} ${screenToX} ${screenToY}`
      }
    }

    // Regular straight line for non-crossing traces
    if (edgeIndex === 0) {
      path += `M ${screenFromX} ${screenFromY} L ${screenToX} ${screenToY}`
    } else {
      path += ` L ${screenToX} ${screenToY}`
    }
  }

  // Only create SVG object if we have a valid path
  return path
    ? [
        {
          name: "path",
          type: "element",
          attributes: {
            class: "trace",
            d: path,
            stroke: colorMap.schematic.wire,
            fill: "none",
            "stroke-width": `${getSchStrokeSize(transform)}px`,
          },
          value: "",
          children: [],
        },
      ]
    : []
}
