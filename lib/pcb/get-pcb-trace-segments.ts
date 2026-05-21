import {
  distance,
  type LayerRef,
  type PcbTrace,
  type Point,
} from "circuit-json"

export type PcbTraceRoutePoint = PcbTrace["route"][number]

export interface PcbTraceSegment {
  start: Point
  end: Point
  layer: LayerRef
  width: number
  isInsideCopperPour: boolean
}

export function getPcbTracePoints(point: PcbTraceRoutePoint): readonly Point[] {
  switch (point.route_type) {
    case "through_pad":
      return [point.start, point.end] as const
    default:
      return [point] as const
  }
}

export function getPcbTraceSegments(
  route: PcbTrace["route"],
): PcbTraceSegment[] {
  const segments: PcbTraceSegment[] = []

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i]
    const end = route[i + 1]
    if (!start || !end) continue

    const startAnchor = start.route_type === "through_pad" ? start.end : start
    const endAnchor = end.route_type === "through_pad" ? end.start : end

    const layer =
      start.route_type === "wire"
        ? start.layer
        : start.route_type === "through_pad"
          ? start.end_layer
          : end.route_type === "wire"
            ? end.layer
            : end.route_type === "through_pad"
              ? end.start_layer
              : null

    if (!layer) continue

    if (isSamePoint(startAnchor, endAnchor)) continue

    segments.push({
      start: startAnchor,
      end: endAnchor,
      layer,
      width: "width" in start ? start.width : "width" in end ? end.width : 0,
      isInsideCopperPour: isInsideCopperPour(start) && isInsideCopperPour(end),
    })
  }

  for (const point of route) {
    if (!point || point.route_type !== "through_pad") continue

    for (const layer of new Set([point.start_layer, point.end_layer])) {
      segments.push({
        start: point.start,
        end: point.end,
        layer,
        width: point.width,
        isInsideCopperPour: false,
      })
    }
  }

  return segments
}

function isInsideCopperPour(point: PcbTraceRoutePoint): boolean {
  return (
    "is_inside_copper_pour" in point && point.is_inside_copper_pour === true
  )
}

function isSamePoint(a: Point, b: Point): boolean {
  const ax = distance.parse(a.x)
  const ay = distance.parse(a.y)
  const bx = distance.parse(b.x)
  const by = distance.parse(b.y)

  if (
    ax === undefined ||
    ay === undefined ||
    bx === undefined ||
    by === undefined
  ) {
    return a.x === b.x && a.y === b.y
  }

  return ax === bx && ay === by
}
