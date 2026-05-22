import {
  distance,
  type PCBVia,
  type PcbBoard,
  type PcbTrace,
  type Point,
} from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { getPcbTraceSegments } from "../get-pcb-trace-segments"
import { createSvgObjectsFromPcbVia } from "./create-svg-objects-from-pcb-via"

export function createSvgObjectsFromPcbTrace(
  trace: PcbTrace,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, showSolderMask } = ctx
  if (!trace.route || !Array.isArray(trace.route) || trace.route.length < 2)
    return []

  const svgObjects: SvgObject[] = []
  const standaloneViaPositionKeys = getStandaloneViaPositionKeys(ctx)

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
    if (!point || point.route_type !== "via") continue
    if (standaloneViaPositionKeys.has(getPositionKey(point))) continue

    svgObjects.push(
      createSvgObjectsFromPcbVia(
        createSyntheticViaFromRoutePoint(trace, point, index, ctx),
        ctx,
      ),
    )
  }

  return svgObjects
}

function createSyntheticViaFromRoutePoint(
  trace: PcbTrace,
  point: Extract<PcbTrace["route"][number], { route_type: "via" }>,
  routeIndex: number,
  ctx: PcbContext,
): PCBVia {
  const width = getAdjacentTraceWidth(trace.route, routeIndex)
  const { holeDiameter, outerDiameter } = getRouteViaDiameters(ctx, width)

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

function getRouteViaDiameters(
  ctx: PcbContext,
  adjacentTraceWidth: number,
): {
  holeDiameter: number
  outerDiameter: number
} {
  const board = ctx.circuitJson?.find(
    (elm): elm is PcbBoard => elm.type === "pcb_board",
  )
  const boardMinViaHoleDiameter = parseOptionalDistance(
    board?.min_via_hole_diameter,
  )
  const boardMinViaPadDiameter = parseOptionalDistance(
    board?.min_via_pad_diameter,
  )

  // Older circuit-json payloads can omit board-level via DRC fields.
  const fallbackHoleDiameter = Math.max(adjacentTraceWidth, 0.3)
  const holeDiameter = boardMinViaHoleDiameter ?? fallbackHoleDiameter
  const outerDiameter =
    boardMinViaPadDiameter ?? Math.max(fallbackHoleDiameter * 2, 0.6)

  return {
    holeDiameter,
    outerDiameter,
  }
}

function getStandaloneViaPositionKeys(ctx: PcbContext): Set<string> {
  return new Set(
    ctx.circuitJson
      ?.filter((elm): elm is PCBVia => elm.type === "pcb_via")
      .map((via) => getPositionKey(via)) ?? [],
  )
}

function getPositionKey(point: Pick<Point, "x" | "y">): string {
  const x = parseOptionalDistance(point.x)
  const y = parseOptionalDistance(point.y)

  if (x !== undefined && y !== undefined) {
    return `${x}:${y}`
  }

  return `${String(point.x)}:${String(point.y)}`
}

function parseOptionalDistance(
  value: string | number | null | undefined,
): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  const result = distance.safeParse(value)

  return result.success ? result.data : undefined
}
