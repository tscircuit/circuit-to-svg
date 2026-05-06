import type { PCBTrace } from "circuit-json"
import { pairs } from "lib/utils/pairs"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

// Most route entries (wire, via) carry coordinates at the top level
// as `{ x, y }`. `through_obstacle` entries instead nest them as
// `{ start: { x, y }, end: { x, y } }`, where `start` is the entry
// point of the obstacle and `end` is the exit point.
//
// For a segment between consecutive route entries A → B:
//   - the segment's START point is A's "exit" coord
//     (A.end?.{x,y} for through_obstacle, otherwise A.{x,y})
//   - the segment's END point is B's "entry" coord
//     (B.start?.{x,y} for through_obstacle, otherwise B.{x,y})
const exitCoord = (p: any): [number, number] | null => {
  if (typeof p?.end?.x === "number" && typeof p?.end?.y === "number")
    return [p.end.x, p.end.y]
  if (typeof p?.x === "number" && typeof p?.y === "number") return [p.x, p.y]
  return null
}
const entryCoord = (p: any): [number, number] | null => {
  if (typeof p?.start?.x === "number" && typeof p?.start?.y === "number")
    return [p.start.x, p.start.y]
  if (typeof p?.x === "number" && typeof p?.y === "number") return [p.x, p.y]
  return null
}

export function createSvgObjectsFromPcbTrace(
  trace: PCBTrace,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, showSolderMask } = ctx
  if (!trace.route || !Array.isArray(trace.route) || trace.route.length < 2)
    return []

  const segments = pairs(trace.route)
  const svgObjects: SvgObject[] = []

  for (const [start, end] of segments) {
    if (
      start.is_inside_copper_pour === true &&
      end.is_inside_copper_pour === true
    ) {
      continue
    }

    const startCoord = exitCoord(start)
    const endCoord = entryCoord(end)
    if (!startCoord || !endCoord) continue

    const startPoint = applyToPoint(transform, startCoord)
    const endPoint = applyToPoint(transform, endCoord)

    const layer =
      "layer" in start ? start.layer : "layer" in end ? end.layer : null
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
