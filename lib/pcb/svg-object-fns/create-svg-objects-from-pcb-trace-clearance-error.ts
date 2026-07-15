import type {
  AnyCircuitElement,
  PcbPadTraceClearanceError,
  PcbPort,
  PcbPlatedHole,
  PcbSmtPad,
  PcbTrace,
  PcbTraceError,
  PcbTraceRoutePoint,
  PcbVia,
  PcbViaTraceClearanceError,
  SourceTrace,
} from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "../../../lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createSvgObjectsFromPcbTraceError } from "./create-svg-objects-from-pcb-trace-error"

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

function getPcbPortIdsForTrace(
  trace: PcbTrace | undefined,
  circuitJson: AnyCircuitElement[],
): [string, string] | undefined {
  if (!trace) return undefined

  const explicitPcbPortIds = trace.route.flatMap((routePoint) => {
    if (routePoint.route_type !== "wire") return []
    return [routePoint.start_pcb_port_id, routePoint.end_pcb_port_id].filter(
      (id): id is string => id !== undefined,
    )
  })

  const sourceTrace = circuitJson.find(
    (element): element is SourceTrace =>
      element.type === "source_trace" &&
      element.source_trace_id === trace.source_trace_id,
  )
  const sourceTracePcbPortIds =
    sourceTrace?.connected_source_port_ids.flatMap((sourcePortId) => {
      const pcbPort = circuitJson.find(
        (element): element is PcbPort =>
          element.type === "pcb_port" &&
          element.source_port_id === sourcePortId,
      )
      return pcbPort ? [pcbPort.pcb_port_id] : []
    }) ?? []

  const pcbPortIds = [
    ...new Set([...explicitPcbPortIds, ...sourceTracePcbPortIds]),
  ]
  return pcbPortIds.length >= 2 ? [pcbPortIds[0]!, pcbPortIds[1]!] : undefined
}

function midpoint(pointA: PcbPoint, pointB: PcbPoint): PcbPoint {
  return {
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2,
  }
}

function createDashedReferenceLine(
  referencePoint: PcbPoint,
  errorCenter: PcbPoint,
  referenceType: "obstacle" | "trace-start" | "trace-end",
): SvgObject | undefined {
  const dx = referencePoint.x - errorCenter.x
  const dy = referencePoint.y - errorCenter.y
  if (dx * dx + dy * dy < 0.25) return undefined

  return {
    type: "element",
    name: "line",
    value: "",
    attributes: {
      x1: referencePoint.x.toString(),
      y1: referencePoint.y.toString(),
      x2: errorCenter.x.toString(),
      y2: errorCenter.y.toString(),
      stroke: "red",
      "stroke-width": "1.5",
      "stroke-dasharray": "2,2",
      "data-error-reference": referenceType,
    },
    children: [],
  }
}

function annotateError(
  objects: SvgObject[],
  errorType: PcbTraceClearanceError["type"],
): SvgObject[] {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...(object.attributes ?? {}),
      "data-type": errorType,
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
  const worldErrorCenter = isFinitePoint(error.center)
    ? error.center
    : (obstacleCenter ??
      (traceEndpoints
        ? midpoint(traceEndpoints.start, traceEndpoints.end)
        : undefined))

  if (!worldErrorCenter) return []

  const screenErrorCenter = applyToPoint(
    transform,
    worldErrorCenter,
  ) as PointObjectNotation
  const screenObstacleCenter = obstacleCenter
    ? (applyToPoint(transform, obstacleCenter) as PointObjectNotation)
    : undefined
  const screenTraceEndpoints = traceEndpoints
    ? {
        start: applyToPoint(
          transform,
          traceEndpoints.start,
        ) as PointObjectNotation,
        end: applyToPoint(transform, traceEndpoints.end) as PointObjectNotation,
      }
    : undefined

  const referenceLines = [
    screenTraceEndpoints
      ? createDashedReferenceLine(
          screenTraceEndpoints.start,
          screenErrorCenter,
          "trace-start",
        )
      : undefined,
    screenTraceEndpoints
      ? createDashedReferenceLine(
          screenTraceEndpoints.end,
          screenErrorCenter,
          "trace-end",
        )
      : undefined,
    screenObstacleCenter
      ? createDashedReferenceLine(
          screenObstacleCenter,
          screenErrorCenter,
          "obstacle",
        )
      : undefined,
  ].filter((object): object is SvgObject => object !== undefined)

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

  const pcbPortIds = getPcbPortIdsForTrace(trace, circuitJson)
  if (pcbPortIds) {
    const pcbComponentIds = pcbPortIds.flatMap((pcbPortId) => {
      const pcbPort = circuitJson.find(
        (element): element is PcbPort =>
          element.type === "pcb_port" && element.pcb_port_id === pcbPortId,
      )
      return pcbPort?.pcb_component_id ? [pcbPort.pcb_component_id] : []
    })
    const clearanceErrorId =
      error.type === "pcb_pad_trace_clearance_error"
        ? error.pcb_pad_trace_clearance_error_id
        : error.pcb_via_trace_clearance_error_id
    const traceError: PcbTraceError = {
      type: "pcb_trace_error",
      error_type: "pcb_trace_error",
      pcb_trace_error_id: clearanceErrorId,
      message,
      pcb_trace_id: error.pcb_trace_id,
      source_trace_id: trace?.source_trace_id ?? "",
      pcb_component_ids: pcbComponentIds,
      pcb_port_ids: pcbPortIds,
      center: isFinitePoint(error.center) ? error.center : undefined,
      subcircuit_id: error.subcircuit_id,
    }

    return annotateError(
      createSvgObjectsFromPcbTraceError(traceError, circuitJson, ctx),
      error.type,
    )
  }

  const svgObjects: SvgObject[] = [
    ...referenceLines,
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
