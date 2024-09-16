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
  const svgObjects: SvgObject[] = []

  for (const [start, end] of segments) {
    const startPoint = applyToPoint(transform, [start.x, start.y])
    const endPoint = applyToPoint(transform, [end.x, end.y])

    const layer =
      "layer" in start ? start.layer : "layer" in end ? end.layer : null
    if (!layer) continue

    const layerColor =
      LAYER_NAME_TO_COLOR[layer as keyof typeof LAYER_NAME_TO_COLOR] ?? "white"

    const traceWidth =
      "width" in start ? start.width : "width" in end ? end.width : null

    svgObjects.push({
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-trace",
        stroke: layerColor,
        d: `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`,
        "stroke-width": traceWidth
          ? (traceWidth * Math.abs(transform.a)).toString()
          : "0.3",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "shape-rendering": "crispEdges",
      },
    })
  }
  return svgObjects
}
