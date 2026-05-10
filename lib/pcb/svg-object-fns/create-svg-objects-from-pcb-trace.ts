import type { PcbTrace } from "circuit-json"
import { pairs } from "lib/utils/pairs"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbTrace(
  trace: PcbTrace,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, showSolderMask } = ctx
  if (!trace.route || !Array.isArray(trace.route) || trace.route.length < 2)
    return []

  const segments = pairs(trace.route)
  const svgObjects: SvgObject[] = []

  const getSegmentPoint = (
    point: PcbTrace["route"][number],
    side: "start" | "end",
  ) => {
    if (point.route_type === "through_pad") {
      return side === "start" ? point.start : point.end
    }
    return point
  }

  for (const [start, end] of segments) {
    if (
      "is_inside_copper_pour" in start &&
      "is_inside_copper_pour" in end &&
      start.is_inside_copper_pour === true &&
      end.is_inside_copper_pour === true
    ) {
      continue
    }

    const startCoords = getSegmentPoint(start, "start")
    const endCoords = getSegmentPoint(end, "end")

    const startPoint = applyToPoint(transform, [startCoords.x, startCoords.y])
    const endPoint = applyToPoint(transform, [endCoords.x, endCoords.y])

    const layer =
      "layer" in start
        ? start.layer
        : "layer" in end
          ? end.layer
          : start.route_type === "through_pad"
            ? start.start_layer
            : end.route_type === "through_pad"
              ? end.end_layer
              : null
    if (!layer) continue
    if (layerFilter && layer !== layerFilter) continue
    // Trace soldermask strokes live on the same copper layer (top/bottom/etc.)
    const maskLayer = layer

    const copperColor = layerNameToColor(layer, colorMap)
    const maskColor =
      colorMap.soldermaskWithCopperUnderneath[
        layer as keyof typeof colorMap.soldermaskWithCopperUnderneath
      ]

    const traceWidth =
      "width" in start ? start.width : "width" in end ? end.width : null

    const width = traceWidth
      ? (traceWidth * Math.abs(transform.a)).toString()
      : "0.3"

    if (showSolderMask) {
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
          "data-type": "pcb_trace_soldermask",
          "data-pcb-layer": layer,
        },
      }

      svgObjects.push(maskObject)
    } else {
      const maskOnlyObject: SvgObject = {
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
          "data-type": showSolderMask ? "pcb_soldermask" : "pcb_trace",
          "data-pcb-layer": layer,
        },
      }

      svgObjects.push(maskOnlyObject)
    }
  }

  return svgObjects
}
