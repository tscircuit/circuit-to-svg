import type { PCBTrace } from "circuit-json"
import { pairs } from "lib/utils/pairs"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbTrace(
  trace: PCBTrace,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, renderSolderMask } = ctx
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
    if (layerFilter && layer !== layerFilter) continue

    const copperColor = layerNameToColor(layer, colorMap)
    const maskColor =
      colorMap.soldermask[layer as keyof typeof colorMap.soldermask] ??
      copperColor

    const traceWidth =
      "width" in start ? start.width : "width" in end ? end.width : null

    const width = traceWidth
      ? (traceWidth * Math.abs(transform.a)).toString()
      : "0.3"

    if (renderSolderMask) {
      const copperObject: SvgObject = {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-trace",
          stroke: copperColor,
          fill: "none",
          d: `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`,
          "stroke-width": width,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "shape-rendering": "crispEdges",
          "data-layer": layer,
        },
      }

      const maskObject: SvgObject = {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-soldermask",
          stroke: maskColor,
          fill: "none",
          d: `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`,
          "stroke-width": width,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "shape-rendering": "crispEdges",
          "data-layer": layer,
        },
      }

      svgObjects.push(maskObject, copperObject)
    } else {
      const maskOnlyObject: SvgObject = {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-trace",
          stroke: maskColor,
          fill: "none",
          d: `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`,
          "stroke-width": width,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "shape-rendering": "crispEdges",
          "data-layer": layer,
        },
      }

      svgObjects.push(maskOnlyObject)
    }
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
