import type { PCBTrace } from "@tscircuit/soup"
import { pairs } from "src/utils/pairs"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import { LAYER_NAME_TO_COLOR } from "../layer-name-to-color"

export function createSvgObjectsFromPcbTrace(
  trace: PCBTrace,
  transform: any,
): SvgObject[] {
  if (!trace.route || !Array.isArray(trace.route) || trace.route.length < 2)
    return []

  const segments = pairs(trace.route)
  const wireObjects: SvgObject[] = []
  const viaObjects: SvgObject[] = []

  for (const [start, end] of segments) {
    const startPoint = applyToPoint(transform, [start.x, start.y])
    const endPoint = applyToPoint(transform, [end.x, end.y])

    if (start.route_type === "wire") {
      const layer = start.layer
      if (!layer) continue

      const layerColor =
        LAYER_NAME_TO_COLOR[layer as keyof typeof LAYER_NAME_TO_COLOR] ?? "white"

      const traceWidth = start.width || 0.1

      wireObjects.push({
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-trace wire",
          stroke: layerColor,
          d: `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`,
          "stroke-width": (traceWidth * Math.abs(transform.a)).toString(),
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "shape-rendering": "crispEdges",
        },
      })
    } else if (start.route_type === "via") {
      const fromLayerColor =
        LAYER_NAME_TO_COLOR[start.from_layer as keyof typeof LAYER_NAME_TO_COLOR] ?? "white"
      const toLayerColor =
        LAYER_NAME_TO_COLOR[start.to_layer as keyof typeof LAYER_NAME_TO_COLOR] ?? "white"

      const outerRadius = 0.3 * Math.abs(transform.a)
      const innerRadius = 0.15 * Math.abs(transform.a)

      viaObjects.push({
        name: "g",
        type: "element",
        children: [
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "pcb-hole-outer",
              cx: startPoint[0].toString(),
              cy: startPoint[1].toString(),
              r: outerRadius.toString(),
              fill: fromLayerColor,
            },
            value: "",
            children: []
          },
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "pcb-hole-inner",
              cx: startPoint[0].toString(),
              cy: startPoint[1].toString(),
              r: innerRadius.toString(),
              fill: toLayerColor,
            },
            value: "",
            children: []
          },
        ],
        value: "",
        attributes: {}
      })
    }
  }

  // Combine wire and via objects, with vias on top
  return [...wireObjects, ...viaObjects]
}