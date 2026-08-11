import {
  type PCBVia,
  type LayerRef,
  type PcbBoard,
  type PcbCopperPour,
  type PcbTrace,
  type Point,
  distance,
} from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import { clipPcbTraceSegmentAtCopperPourBoundary } from "../clip-pcb-trace-segment-at-copper-pour-boundary"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import {
  getPcbTraceSegments,
  type PcbTraceSegment,
} from "../get-pcb-trace-segments"
import { getInterpolatedTracePolygon } from "../get-interpolated-trace-polygon"
import { layerNameToColor } from "../layer-name-to-color"
import { createSvgObjectsFromPcbVia } from "./create-svg-objects-from-pcb-via"
import { getCopperPourTraceMaskIdForLayer } from "../copper-pour-trace-mask"

export function createSvgObjectsFromPcbTrace(
  trace: PcbTrace,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, showSolderMask } = ctx
  if (!trace.route || !Array.isArray(trace.route) || trace.route.length < 2)
    return []

  const svgObjects: SvgObject[] = []
  const standaloneViaPositionKeys = getStandaloneViaPositionKeys(ctx)

  const pourMaskIdByLayer = new Map<string, string | undefined>()
  const drawableSegments: PcbTraceSegment[] = []

  for (const originalSegment of getPcbTraceSegments(trace.route)) {
    let segment = originalSegment

    if (segment.isInsideCopperPour) {
      continue
    }

    if (
      segment.copperPourId &&
      segment.startIsInsideCopperPour !== segment.endIsInsideCopperPour
    ) {
      const copperPour = ctx.circuitJson?.find(
        (element): element is PcbCopperPour =>
          element.type === "pcb_copper_pour" &&
          element.pcb_copper_pour_id === segment.copperPourId,
      )

      if (copperPour) {
        const clippedSegment = clipPcbTraceSegmentAtCopperPourBoundary(
          segment,
          copperPour,
        )
        if (!clippedSegment) continue
        segment = clippedSegment
      }
    }

    const layer = segment.layer
    if (!layer) continue
    if (layerFilter && layer !== layerFilter) continue

    drawableSegments.push(segment)
  }

  const getPourMaskAttributes = (layer: LayerRef): Record<string, string> => {
    if (!pourMaskIdByLayer.has(layer)) {
      pourMaskIdByLayer.set(
        layer,
        ctx.circuitJson
          ? getCopperPourTraceMaskIdForLayer({
              layer,
              circuitJson: ctx.circuitJson,
            })
          : undefined,
      )
    }
    const pourMaskId = pourMaskIdByLayer.get(layer)
    if (pourMaskId) {
      ctx.usedCopperPourTraceMaskIds?.add(pourMaskId)
      return { mask: `url(#${pourMaskId})` }
    }
    return {}
  }

  if (trace.route_thickness_mode === "interpolated") {
    for (const segments of getConnectedTraceSegmentGroups(drawableSegments)) {
      const layer = segments[0]?.layer
      if (!layer) continue
      const d = getInterpolatedTracePathData(segments, transform)
      if (!d) continue

      const copperColor = layerNameToColor(layer, colorMap)
      const maskColor =
        colorMap.soldermaskWithCopperUnderneath[
          layer as keyof typeof colorMap.soldermaskWithCopperUnderneath
        ]

      svgObjects.push({
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: showSolderMask ? "pcb-soldermask" : "pcb-trace",
          fill: showSolderMask ? maskColor : copperColor,
          stroke: "none",
          d,
          "shape-rendering": "geometricPrecision",
          "data-type": showSolderMask ? "pcb_trace_soldermask" : "pcb_trace",
          "data-pcb-layer": layer,
          ...getPourMaskAttributes(layer),
        },
      })
    }
  } else {
    for (const segment of drawableSegments) {
      const startPoint = applyToPoint(transform, [
        segment.start.x,
        segment.start.y,
      ])
      const endPoint = applyToPoint(transform, [segment.end.x, segment.end.y])
      const layer = segment.layer

      const copperColor = layerNameToColor(layer, colorMap)
      const maskColor =
        colorMap.soldermaskWithCopperUnderneath[
          layer as keyof typeof colorMap.soldermaskWithCopperUnderneath
        ]

      const width = segment.width
        ? (segment.width * Math.abs(transform.a)).toString()
        : "0.3"

      const pourMaskAttributes = getPourMaskAttributes(layer)

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
            ...pourMaskAttributes,
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
            "data-type": "pcb_trace",
            "data-pcb-layer": layer,
            ...pourMaskAttributes,
          },
        }

        svgObjects.push(maskOnlyObject)
      }
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

function getConnectedTraceSegmentGroups(
  segments: PcbTraceSegment[],
): PcbTraceSegment[][] {
  const groups: PcbTraceSegment[][] = []

  for (const segment of segments) {
    const currentGroup = groups[groups.length - 1]
    const previousSegment = currentGroup?.[currentGroup.length - 1]
    if (
      currentGroup &&
      previousSegment?.layer === segment.layer &&
      areSamePosition(previousSegment.end, segment.start)
    ) {
      currentGroup.push(segment)
    } else {
      groups.push([segment])
    }
  }

  return groups
}

function getInterpolatedTracePathData(
  segments: PcbTraceSegment[],
  transform: PcbContext["transform"],
): string {
  const firstSegment = segments[0]
  if (!firstSegment) return ""

  const centerLine = [
    {
      x: distance.parse(firstSegment.start.x),
      y: distance.parse(firstSegment.start.y),
      width: firstSegment.startWidth,
    },
    ...segments.map((segment) => ({
      x: distance.parse(segment.end.x),
      y: distance.parse(segment.end.y),
      width: segment.endWidth,
    })),
  ]
  const polygon = getInterpolatedTracePolygon(centerLine)
  const transformedPolygon = polygon.map((point) =>
    applyToPoint(transform, [point.x, point.y]),
  )
  const [firstPoint, ...remainingPoints] = transformedPolygon
  if (!firstPoint) return ""

  return [
    `M ${firstPoint[0]} ${firstPoint[1]}`,
    ...remainingPoints.map((point) => `L ${point[0]} ${point[1]}`),
    "Z",
  ].join(" ")
}

function areSamePosition(a: Point, b: Point): boolean {
  return (
    distance.parse(a.x) === distance.parse(b.x) &&
    distance.parse(a.y) === distance.parse(b.y)
  )
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
  const fallbackOuterDiameter = Math.max(fallbackHoleDiameter * 2, 0.6)
  const holeDiameter = boardMinViaHoleDiameter ?? fallbackHoleDiameter
  const outerDiameter = boardMinViaPadDiameter ?? fallbackOuterDiameter

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
