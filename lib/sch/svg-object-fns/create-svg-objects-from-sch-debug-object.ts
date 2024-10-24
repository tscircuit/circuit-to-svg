import type { SchematicDebugObject } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"

export function createSvgObjectsFromSchDebugObject(
  debugObject: SchematicDebugObject,
  transform: Matrix,
): SvgObject[] {
  if (debugObject.shape === "rect") {
    // Calculate corners in local space - flip Y coordinates
    const x = debugObject.center.x - debugObject.size.width / 2
    const y = -(debugObject.center.y - debugObject.size.height / 2)

    // Transform all corners
    const [transformedX, transformedY] = applyToPoint(transform, [x, y])
    const [transformedRight, transformedBottom] = applyToPoint(transform, [
      x + debugObject.size.width,
      y - debugObject.size.height // Flip height direction
    ])

    // Calculate transformed width and height
    const width = Math.abs(transformedRight - transformedX)
    const height = Math.abs(transformedBottom - transformedY)

    // Transform center for label - flip Y
    const [centerX, centerY] = applyToPoint(transform, [
      debugObject.center.x,
      -debugObject.center.y
    ])

    return [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          x: transformedX.toString(),
          y: Math.min(transformedY, transformedBottom).toString(),
          width: width.toString(),
          height: height.toString(),
          fill: "none",
          stroke: "red",
          "stroke-width": (0.02 * Math.abs(transform.a)).toString(),
          "stroke-dasharray": "5,5",
        },
        children: debugObject.label
          ? [
              {
                name: "text",
                type: "element",
                value: "",
                attributes: {
                  x: centerX.toString(),
                  y: (centerY - 10).toString(),
                  "text-anchor": "middle",
                  "font-size": (0.2 * Math.abs(transform.a)).toString(),
                  fill: "red",
                },
                children: [
                  {
                    type: "text",
                    value: debugObject.label,
                    name: "",
                    attributes: {},
                    children: [],
                  },
                ],
              },
            ]
          : [],
      },
    ]
  }
  if (debugObject.shape === "line") {
    // Transform start and end points - flip Y coordinates
    const [startX, startY] = applyToPoint(transform, [
      debugObject.start.x,
      -debugObject.start.y, // Flip Y
    ])
    const [endX, endY] = applyToPoint(transform, [
      debugObject.end.x,
      -debugObject.end.y, // Flip Y
    ])

    // Calculate midpoint for label
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2

    return [
      {
        name: "line",
        type: "element",
        value: "",
        attributes: {
          x1: startX.toString(),
          y1: startY.toString(),
          x2: endX.toString(),
          y2: endY.toString(),
          stroke: "red",
          "stroke-width": (0.02 * Math.abs(transform.a)).toString(),
          "stroke-dasharray": "5,5",
        },
        children: debugObject.label
          ? [
              {
                name: "text",
                type: "element",
                value: "",
                attributes: {
                  x: midX.toString(),
                  y: (midY - 10).toString(),
                  "text-anchor": "middle",
                  "font-size": (0.2 * Math.abs(transform.a)).toString(),
                  fill: "red",
                },
                children: [
                  {
                    type: "text",
                    value: debugObject.label,
                    name: "",
                    attributes: {},
                    children: [],
                  },
                ],
              },
            ]
          : [],
      },
    ]
  }
  return []
}