import type { PCBTrace } from "circuit-json"
import { pairs } from "lib/utils/pairs"
import type { INode as SvgObject } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { LAYER_NAME_TO_COLOR } from "../layer-name-to-color"

export function createSvgObjectsFromPcbTrace(
  trace: PCBTrace,
  transform: Matrix,
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

    const svgObject: SvgObject = {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-trace",
        stroke: layerColor,
        fill: "none",
        d: `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`,
        "stroke-width": traceWidth
          ? (traceWidth * Math.abs(transform.a)).toString()
          : "0.3",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "shape-rendering": "crispEdges",
        "data-layer": layer,
      },
    }

    svgObjects.push(svgObject)
  }

  svgObjects.sort((a, b) => {
    const layerA = a.attributes["data-layer"]
    const layerB = b.attributes["data-layer"]

    if (layerA === "bottom" && layerB !== "bottom") {
      return -1
    }
    if (layerA === "top" && layerB !== "top") {
      return 1
    }
    return 0
  })

  return svgObjects
}
