import type { SchematicTrace } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"

export function createSchematicTrace(
  trace: SchematicTrace,
  transform: Matrix,
): SvgObject[] {
  const edges = trace.edges
  if (edges.length === 0) return []

  let path = ""

  // Process all edges
  edges.forEach((edge: any, index: number) => {
    // Get the points, applying trace offset
    const fromPoint = {
      x: edge.from.x ?? edge.from.center?.x,
      y: edge.from.y ?? edge.from.center?.y,
    }
    const toPoint = {
      x: edge.to.x ?? edge.to.center?.x,
      y: edge.to.y ?? edge.to.center?.y,
    }

    // Transform the points using the matrix
    const [transformedFromX, transformedFromY] = applyToPoint(transform, [
      fromPoint.x,
      fromPoint.y,
    ])
    const [transformedToX, transformedToY] = applyToPoint(transform, [
      toPoint.x,
      toPoint.y,
    ])

    // Build the path string
    if (index === 0) {
      path += `M ${transformedFromX} ${transformedFromY} L ${transformedToX} ${transformedToY}`
    } else {
      path += ` L ${transformedToX} ${transformedToY}`
    }
  })

  // Only create SVG object if we have a valid path
  return path
    ? [
        {
          name: "path",
          type: "element",
          attributes: {
            class: "trace",
            d: path,
            "stroke-width": (0.02 * Math.abs(transform.a)).toString(), // Scale stroke width with transform
          },
          value: "",
          children: [],
        },
      ]
    : []
}
