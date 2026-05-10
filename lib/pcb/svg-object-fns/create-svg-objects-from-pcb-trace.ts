import type { PcbTrace } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { getPcbTraceSegments } from "../get-pcb-trace-segments"

export function createSvgObjectsFromPcbTrace(
  trace: PcbTrace,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, showSolderMask } = ctx
  if (!trace.route || !Array.isArray(trace.route) || trace.route.length < 2)
    return []

  const svgObjects: SvgObject[] = []

  for (const segment of getPcbTraceSegments(trace.route)) {
    if (segment.isInsideCopperPour) {
      continue
    }

    const startPoint = applyToPoint(transform, [segment.start.x, segment.start.y])
    const endPoint = applyToPoint(transform, [segment.end.x, segment.end.y])
    const layer = segment.layer
    if (!layer) continue
    if (layerFilter && layer !== layerFilter) continue

    const copperColor = layerNameToColor(layer, colorMap)
    const maskColor =
      colorMap.soldermaskWithCopperUnderneath[
        layer as keyof typeof colorMap.soldermaskWithCopperUnderneath
      ]

    const width = segment.width
      ? (segment.width * Math.abs(transform.a)).toString()
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
