import { distance, type PCBVia, type PcbTrace } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { getPcbTraceSegments } from "../get-pcb-trace-segments"
import { createSvgObjectsFromPcbVia } from "./create-svg-objects-from-pcb-via"

const DEFAULT_ROUTE_VIA_OUTER_DIAMETER = 0.6
const DEFAULT_ROUTE_VIA_HOLE_DIAMETER = 0.3

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

    const startPoint = applyToPoint(transform, [
      segment.start.x,
      segment.start.y,
    ])
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

  for (const [index, point] of trace.route.entries()) {
    if (point.route_type !== "via") continue
    if (hasStandaloneViaAtRoutePoint(trace, point, ctx)) continue

    svgObjects.push(
      createSvgObjectsFromPcbVia(
        createSyntheticViaFromRoutePoint(trace, index),
        ctx,
      ),
    )
  }

  return svgObjects
}

function hasStandaloneViaAtRoutePoint(
  trace: PcbTrace,
  point: Extract<PcbTrace["route"][number], { route_type: "via" }>,
  ctx: PcbContext,
): boolean {
  return (
    ctx.circuitJson?.some(
      (elm): elm is PCBVia =>
        elm.type === "pcb_via" &&
        isSameCoordinate(elm.x, point.x) &&
        isSameCoordinate(elm.y, point.y) &&
        (elm.pcb_trace_id == null || elm.pcb_trace_id === trace.pcb_trace_id),
    ) ?? false
  )
}

function createSyntheticViaFromRoutePoint(
  trace: PcbTrace,
  routeIndex: number,
): PCBVia {
  const point = trace.route[routeIndex]
  if (!point || point.route_type !== "via") {
    throw new Error("Expected route_type 'via' when creating a synthetic via")
  }

  const width = getAdjacentTraceWidth(trace.route, routeIndex)
  const holeDiameter = Math.max(DEFAULT_ROUTE_VIA_HOLE_DIAMETER, width)
  const outerDiameter = Math.max(
    DEFAULT_ROUTE_VIA_OUTER_DIAMETER,
    holeDiameter * 2,
  )

  return {
    type: "pcb_via",
    pcb_via_id: `${trace.pcb_trace_id}_route_via_${routeIndex}`,
    pcb_trace_id: trace.pcb_trace_id,
    x: point.x,
    y: point.y,
    outer_diameter: outerDiameter,
    hole_diameter: holeDiameter,
    layers: [point.from_layer, point.to_layer],
  }
}

function getAdjacentTraceWidth(
  route: PcbTrace["route"],
  routeIndex: number,
): number {
  const prevWidth = findTraceWidth(route, routeIndex, -1)
  const nextWidth = findTraceWidth(route, routeIndex, 1)

  return Math.max(prevWidth ?? 0, nextWidth ?? 0)
}

function findTraceWidth(
  route: PcbTrace["route"],
  startIndex: number,
  direction: -1 | 1,
): number | undefined {
  for (
    let index = startIndex + direction;
    index >= 0 && index < route.length;
    index += direction
  ) {
    const point = route[index]
    if (!point || !("width" in point) || typeof point.width !== "number") {
      continue
    }

    return point.width
  }

  return undefined
}

function isSameCoordinate(a: number | string, b: number | string): boolean {
  const parsedA = distance.parse(a)
  const parsedB = distance.parse(b)

  if (parsedA === undefined || parsedB === undefined) {
    return a === b
  }

  return parsedA === parsedB
}
