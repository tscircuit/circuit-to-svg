import type { SchematicDebugObject } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"

export function createSvgObjectsFromSchDebugObject({
  debugObject,
  transform,
}: {
  debugObject: SchematicDebugObject
  transform: Matrix
}): SvgObject[] {
  if (debugObject.shape === "rect") {
    // Transform all corners
    let [screenLeft, screenTop] = applyToPoint(transform, [
      debugObject.center.x - debugObject.size.width / 2,
      debugObject.center.y - debugObject.size.height / 2,
    ])
    let [screenRight, screenBottom] = applyToPoint(transform, [
      debugObject.center.x + debugObject.size.width / 2,
      debugObject.center.y + debugObject.size.height / 2,
    ])
    ;[screenTop, screenBottom] = [
      Math.min(screenTop, screenBottom),
      Math.max(screenTop, screenBottom),
    ]

    // Calculate screen width and height
    const width = Math.abs(screenRight - screenLeft)
    const height = Math.abs(screenBottom - screenTop)

    const [screenCenterX, screenCenterY] = applyToPoint(transform, [
      debugObject.center.x,
      debugObject.center.y,
    ])

    return [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          x: screenLeft.toString(),
          y: screenTop.toString(),
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
                  x: screenCenterX.toString(),
                  y: (screenCenterY - 10).toString(),
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
    const [screenStartX, screenStartY] = applyToPoint(transform, [
      debugObject.start.x,
      debugObject.start.y,
    ])
    const [screenEndX, screenEndY] = applyToPoint(transform, [
      debugObject.end.x,
      debugObject.end.y,
    ])

    // Calculate midpoint for label
    const screenMidX = (screenStartX + screenEndX) / 2
    const screenMidY = (screenStartY + screenEndY) / 2

    return [
      {
        name: "line",
        type: "element",
        value: "",
        attributes: {
          x1: screenStartX.toString(),
          y1: screenStartY.toString(),
          x2: screenEndX.toString(),
          y2: screenEndY.toString(),
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
                  x: screenMidX.toString(),
                  y: (screenMidY - 10).toString(),
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
