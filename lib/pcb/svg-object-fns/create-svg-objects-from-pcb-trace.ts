import type { PCBTrace } from "circuit-json"
import { pairs } from "lib/utils/pairs"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import { compareCopperLayers, getCopperLayerName } from "../layer-order"
import type { CopperLayerName } from "../colors"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

type TraceRoutePoint = PCBTrace["route"][number]

function getLayerFromRoutePoint(
  point: TraceRoutePoint,
): CopperLayerName | undefined {
  if (point.route_type === "wire") {
    return getCopperLayerName(point.layer)
  }

  return (
    getCopperLayerName(point.from_layer) ?? getCopperLayerName(point.to_layer)
  )
}

function getSegmentLayer(
  start: TraceRoutePoint,
  end: TraceRoutePoint,
): CopperLayerName | undefined {
  return getLayerFromRoutePoint(start) ?? getLayerFromRoutePoint(end)
}

export function createSvgObjectsFromPcbTrace(
  trace: PCBTrace,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, renderSolderMask } = ctx
  if (!trace.route || !Array.isArray(trace.route) || trace.route.length < 2)
    return []

  const segments = pairs(trace.route)
  const segmentsByLayer = new Map<CopperLayerName, SvgObject[]>()

  for (const [start, end] of segments) {
    const startPoint = applyToPoint(transform, [start.x, start.y])
    const endPoint = applyToPoint(transform, [end.x, end.y])

    const layer = getSegmentLayer(start, end)
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

    const layerObjects: SvgObject[] = []

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

      layerObjects.push(maskObject, copperObject)
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

      layerObjects.push(maskOnlyObject)
    }

    const bucket = segmentsByLayer.get(layer)
    if (bucket) {
      bucket.push(...layerObjects)
    } else {
      segmentsByLayer.set(layer, [...layerObjects])
    }
  }

  const orderedLayers = Array.from(segmentsByLayer.keys()).sort(
    compareCopperLayers,
  )

  const svgObjects: SvgObject[] = []
  for (const layer of orderedLayers) {
    const objects = segmentsByLayer.get(layer)
    if (objects) {
      svgObjects.push(...objects)
    }
  }

  return svgObjects
}
