import type {
  AnyCircuitElement,
  PcbPadTraceClearanceError,
  PcbPlatedHole,
  PcbSmtPad,
  PcbTrace,
  PcbTraceRoutePoint,
  PcbVia,
  PcbViaTraceClearanceError,
} from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "../../../lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createSvgObjectsForPcbTraceErrorAnnotation } from "./create-svg-objects-for-pcb-trace-error-annotation"

type PcbTraceClearanceError =
  | PcbPadTraceClearanceError
  | PcbViaTraceClearanceError

type PcbTraceClearanceObstacle = PcbSmtPad | PcbPlatedHole | PcbVia

interface PcbPoint {
  x: number
  y: number
}

interface TraceEndpoints {
  start: PcbPoint
  end: PcbPoint
}

function getClosestPointOnSegment(
  point: PcbPoint,
  start: PcbPoint,
  end: PcbPoint,
): PcbPoint {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return start

  const projection =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  const t = Math.max(0, Math.min(1, projection))
  return { x: start.x + t * dx, y: start.y + t * dy }
}

function getClosestPointOnTrace(
  trace: PcbTrace | undefined,
  point: PcbPoint | undefined,
): PcbPoint | undefined {
  if (!trace || !point) return undefined

  let closestPoint: PcbPoint | undefined
  let closestDistanceSquared = Number.POSITIVE_INFINITY

  for (let i = 0; i < trace.route.length - 1; i++) {
    const start = trace.route[i]
    const end = trace.route[i + 1]
    if (start?.route_type !== "wire" || end?.route_type !== "wire") continue
    if (start.layer !== end.layer) continue
    if (!isFinitePoint(start) || !isFinitePoint(end)) continue

    const candidate = getClosestPointOnSegment(point, start, end)
    const dx = point.x - candidate.x
    const dy = point.y - candidate.y
    const distanceSquared = dx * dx + dy * dy
    if (distanceSquared < closestDistanceSquared) {
      closestPoint = candidate
      closestDistanceSquared = distanceSquared
    }
  }

  return closestPoint
}

function isFinitePoint(
  point: { x?: number; y?: number } | undefined,
): point is PcbPoint {
  return (
    point !== undefined &&
    typeof point.x === "number" &&
    Number.isFinite(point.x) &&
    typeof point.y === "number" &&
    Number.isFinite(point.y)
  )
}

function findObstacle(
  error: PcbTraceClearanceError,
  circuitJson: AnyCircuitElement[],
): PcbTraceClearanceObstacle | undefined {
  if (error.type === "pcb_via_trace_clearance_error") {
    return circuitJson.find(
      (element): element is PcbVia =>
        element.type === "pcb_via" && element.pcb_via_id === error.pcb_via_id,
    )
  }

  return circuitJson.find(
    (element): element is PcbSmtPad | PcbPlatedHole =>
      (element.type === "pcb_smtpad" &&
        element.pcb_smtpad_id === error.pcb_pad_id) ||
      (element.type === "pcb_plated_hole" &&
        element.pcb_plated_hole_id === error.pcb_pad_id),
  )
}

function getObstacleCenter(
  obstacle: PcbTraceClearanceObstacle | undefined,
): PcbPoint | undefined {
  if (!obstacle) return undefined

  if ("x" in obstacle && "y" in obstacle && isFinitePoint(obstacle)) {
    return { x: obstacle.x, y: obstacle.y }
  }

  if (
    obstacle.type === "pcb_smtpad" &&
    obstacle.shape === "polygon" &&
    obstacle.points.length > 0
  ) {
    const points = obstacle.points.filter(isFinitePoint)
    if (points.length === 0) return undefined

    const xValues = points.map((point) => point.x)
    const yValues = points.map((point) => point.y)
    return {
      x: (Math.min(...xValues) + Math.max(...xValues)) / 2,
      y: (Math.min(...yValues) + Math.max(...yValues)) / 2,
    }
  }

  return undefined
}

function getRoutePointPositions(point: PcbTraceRoutePoint): PcbPoint[] {
  if (point.route_type === "through_pad") {
    return [point.start, point.end].filter(isFinitePoint)
  }

  return isFinitePoint(point) ? [{ x: point.x, y: point.y }] : []
}

function getTraceEndpoints(
  trace: PcbTrace | undefined,
): TraceEndpoints | undefined {
  if (!trace) return undefined

  let start: PcbPoint | undefined
  let end: PcbPoint | undefined

  for (const routePoint of trace.route) {
    const positions = getRoutePointPositions(routePoint)
    if (!start && positions[0]) start = positions[0]
    if (positions.length > 0) end = positions[positions.length - 1]
  }

  return start && end ? { start, end } : undefined
}

function annotateError(
  objects: SvgObject[],
  errorType: PcbTraceClearanceError["type"],
): SvgObject[] {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...(object.attributes ?? {}),
      "data-type": object.attributes?.["data-type"] ?? errorType,
      "data-pcb-layer": object.attributes?.["data-pcb-layer"] ?? "overlay",
    },
  }))
}

export function createSvgObjectsFromPcbTraceClearanceError(
  error: PcbTraceClearanceError,
  circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  const { shouldDrawErrors, transform } = ctx
  if (!shouldDrawErrors) return []

  const obstacleCenter = getObstacleCenter(findObstacle(error, circuitJson))
  const trace = circuitJson.find(
    (element): element is PcbTrace =>
      element.type === "pcb_trace" &&
      element.pcb_trace_id === error.pcb_trace_id,
  )
  const traceEndpoints = getTraceEndpoints(trace)
  const errorCenter = isFinitePoint(error.center) ? error.center : undefined
  const traceReferencePoint = getClosestPointOnTrace(
    trace,
    errorCenter ?? obstacleCenter,
  )

  const errorSubject =
    error.type === "pcb_pad_trace_clearance_error" ? "Pad/trace" : "Via/trace"
  const actualClearance = error.actual_clearance
  const minimumClearance = error.minimum_clearance
  const defaultMessage =
    actualClearance !== undefined && minimumClearance !== undefined
      ? `${errorSubject} clearance ${actualClearance} is below minimum ${minimumClearance}`
      : error.type === "pcb_pad_trace_clearance_error"
        ? "Pad and trace too close"
        : "Via and trace too close"
  const message = error.message ?? defaultMessage

  if (traceEndpoints) {
    return createSvgObjectsForPcbTraceErrorAnnotation({
      ctx,
      start: {
        ...traceEndpoints.start,
      },
      end: {
        ...traceEndpoints.end,
      },
      references: [
        ...(obstacleCenter
          ? [{ ...obstacleCenter, dataErrorReference: "obstacle" as const }]
          : []),
        ...(traceReferencePoint
          ? [
              {
                ...traceReferencePoint,
                dataErrorReference: "trace-segment" as const,
              },
            ]
          : []),
      ],
      message,
      errorType: error.type,
    })
  }

  const worldErrorCenter = errorCenter ?? obstacleCenter
  if (!worldErrorCenter) return []

  const screenErrorCenter = applyToPoint(
    transform,
    worldErrorCenter,
  ) as PointObjectNotation

  const svgObjects: SvgObject[] = [
    {
      type: "element",
      name: "rect",
      value: "",
      attributes: {
        x: (screenErrorCenter.x - 5).toString(),
        y: (screenErrorCenter.y - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${screenErrorCenter.x} ${screenErrorCenter.y})`,
      },
      children: [],
    },
    {
      type: "element",
      name: "text",
      value: "",
      attributes: {
        x: screenErrorCenter.x.toString(),
        y: (screenErrorCenter.y - 15).toString(),
        fill: "red",
        "font-family": "sans-serif",
        "font-size": "12",
        "text-anchor": "middle",
      },
      children: [
        {
          type: "text",
          name: "",
          value: message,
          attributes: {},
          children: [],
        },
      ],
    },
  ]

  return annotateError(svgObjects, error.type)
}
