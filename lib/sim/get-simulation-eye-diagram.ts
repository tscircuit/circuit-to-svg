import type { CircuitJson } from "circuit-json"
import { createGraphPoints } from "./simulation-graph-svg/prepare-simulation-graphs/create-graph-points"

// Matches pcb-spice-pipeline's maximum complete-window count.
const MAX_EYE_WINDOWS = 10_000

export interface EyePoint {
  timeMs: number
  voltage: number
}

/** Fold complete two-UI windows on the declared stimulus clock, without resampling. */
export function getSimulationEyeDiagram({
  circuitJson,
  simulation_eye_diagram_id,
}: {
  circuitJson: CircuitJson
  simulation_eye_diagram_id: string
}) {
  const eye = circuitJson.find(
    (element) =>
      element.type === "simulation_eye_diagram" &&
      element.simulation_eye_diagram_id === simulation_eye_diagram_id,
  )
  if (!eye || eye.type !== "simulation_eye_diagram") {
    throw new Error(`Eye diagram "${simulation_eye_diagram_id}" not found`)
  }
  const graphs = circuitJson.filter(
    (element) =>
      element.type === "simulation_transient_voltage_graph" &&
      element.simulation_experiment_id === eye.simulation_experiment_id &&
      element.simulation_voltage_probe_id === eye.simulation_voltage_probe_id,
  )
  const graph = graphs[0]
  if (
    graphs.length !== 1 ||
    graph?.type !== "simulation_transient_voltage_graph"
  ) {
    throw new Error(
      `Eye diagram "${eye.name}" requires one recorded voltage graph for its probe`,
    )
  }
  const points = createGraphPoints(graph)
  if (
    points.length < 2 ||
    points.length !== graph.voltage_levels.length ||
    (graph.timestamps_ms && graph.timestamps_ms.length !== points.length) ||
    points.some(
      (point, index) => index > 0 && point.timeMs <= points[index - 1]!.timeMs,
    )
  ) {
    throw new Error(
      `Eye diagram "${eye.name}" requires finite samples with strictly increasing timestamps`,
    )
  }
  const { unit_interval_ms, time_origin_ms } = eye
  const measurementStartTimeMs = Math.max(
    points[0]!.timeMs,
    eye.start_time_ms ?? points[0]!.timeMs,
  )
  const measurementEndTimeMs = Math.min(
    points.at(-1)!.timeMs,
    eye.end_time_ms ?? points.at(-1)!.timeMs,
  )
  if (
    ![
      unit_interval_ms,
      time_origin_ms,
      measurementStartTimeMs,
      measurementEndTimeMs,
    ].every(Number.isFinite) ||
    unit_interval_ms <= 0 ||
    measurementEndTimeMs <= measurementStartTimeMs
  ) {
    throw new Error(
      `Eye diagram "${eye.name}" requires a positive unit interval and a finite measurement gate`,
    )
  }
  // The clock boundary is half a UI into each two-UI window, matching pcb-spice-pipeline.
  const firstBoundaryIndex = Math.ceil(
    (measurementStartTimeMs + unit_interval_ms / 2 - time_origin_ms) /
      unit_interval_ms -
      1e-9,
  )
  const lastBoundaryIndex = Math.floor(
    (measurementEndTimeMs - 1.5 * unit_interval_ms - time_origin_ms) /
      unit_interval_ms +
      1e-9,
  )
  if (
    !Number.isSafeInteger(firstBoundaryIndex) ||
    !Number.isSafeInteger(lastBoundaryIndex) ||
    firstBoundaryIndex > lastBoundaryIndex
  ) {
    throw new Error(
      `Eye diagram "${eye.name}" has no complete two-UI windows in its measurement gate`,
    )
  }
  const windowCount = lastBoundaryIndex - firstBoundaryIndex + 1
  if (windowCount > MAX_EYE_WINDOWS) {
    throw new Error(
      `Eye diagram "${eye.name}" has ${windowCount} complete windows; the rendering limit is ${MAX_EYE_WINDOWS}`,
    )
  }
  const windows: EyePoint[][] = []
  let sampleIndex = 1
  for (
    let boundaryIndex = firstBoundaryIndex;
    boundaryIndex <= lastBoundaryIndex;
    boundaryIndex++
  ) {
    const windowStartTimeMs =
      time_origin_ms + (boundaryIndex - 0.5) * unit_interval_ms
    const windowEndTimeMs = windowStartTimeMs + 2 * unit_interval_ms
    while (
      sampleIndex < points.length - 1 &&
      points[sampleIndex]!.timeMs <= windowStartTimeMs
    )
      sampleIndex++
    const window: EyePoint[] = [
      {
        timeMs: 0,
        voltage: interpolateVoltage({
          before: points[sampleIndex - 1]!,
          after: points[sampleIndex]!,
          timeMs: windowStartTimeMs,
        }),
      },
    ]
    let windowIndex = sampleIndex
    while (
      windowIndex < points.length - 1 &&
      points[windowIndex]!.timeMs < windowEndTimeMs
    ) {
      const point = points[windowIndex]!
      window.push({
        timeMs: point.timeMs - windowStartTimeMs,
        voltage: point.rawValue,
      })
      windowIndex++
    }
    window.push({
      timeMs: 2 * unit_interval_ms,
      voltage: interpolateVoltage({
        before: points[windowIndex - 1]!,
        after: points[windowIndex]!,
        timeMs: windowEndTimeMs,
      }),
    })
    windows.push(window)
  }
  return { eye, graph, windows, measurementStartTimeMs, measurementEndTimeMs }
}

function interpolateVoltage({
  before,
  after,
  timeMs,
}: {
  before: { timeMs: number; rawValue: number }
  after: { timeMs: number; rawValue: number }
  timeMs: number
}) {
  return (
    before.rawValue +
    ((after.rawValue - before.rawValue) * (timeMs - before.timeMs)) /
      (after.timeMs - before.timeMs)
  )
}
