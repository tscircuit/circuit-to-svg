import {
  type SimulationScopeTraceDisplay,
  type SimulationTransientGraph,
  getGraphLevels,
  isUsableScopeTraceDisplay,
} from "../simulation-graph-svg-shared"

export function createGraphPoints(
  graph: SimulationTransientGraph,
  scopeTraceDisplay?: SimulationScopeTraceDisplay,
): Array<{ timeMs: number; rawValue: number; displayValue: number }> {
  const timestamps = getTimestamps(graph)
  const levels = getGraphLevels(graph)
  const length = Math.min(timestamps.length, levels.length)
  const points: Array<{
    timeMs: number
    rawValue: number
    displayValue: number
  }> = []
  const transformDisplayValue = createDisplayValueTransform(scopeTraceDisplay)

  for (let index = 0; index < length; index++) {
    const timeMs = Number(timestamps[index] ?? Number.NaN)
    const rawValue = Number(levels[index] ?? Number.NaN)

    if (!Number.isFinite(timeMs) || !Number.isFinite(rawValue)) continue

    points.push({
      timeMs,
      rawValue,
      displayValue: transformDisplayValue(rawValue),
    })
  }

  return points
}

function createDisplayValueTransform(
  scopeTraceDisplay?: SimulationScopeTraceDisplay,
): (rawValue: number) => number {
  if (!isUsableScopeTraceDisplay(scopeTraceDisplay)) {
    return (rawValue) => rawValue
  }

  const center = scopeTraceDisplay.center ?? 0
  const offsetDivs = scopeTraceDisplay.offsetDivs ?? 0
  const valuePerDiv = scopeTraceDisplay.valuePerDiv

  return (rawValue) => offsetDivs + (rawValue - center) / valuePerDiv
}

function getTimestamps(graph: SimulationTransientGraph): number[] {
  const levels = getGraphLevels(graph)
  if (
    Array.isArray(graph.timestamps_ms) &&
    graph.timestamps_ms.length === levels.length
  ) {
    return graph.timestamps_ms.map((value: number) => Number(value))
  }

  const count = levels.length
  if (count === 0) return []

  const timestamps: number[] = []
  for (let index = 0; index < count; index++) {
    timestamps.push(graph.start_time_ms + graph.time_per_step * index)
  }

  const lastTimestamp =
    timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined
  if (
    lastTimestamp !== undefined &&
    Number.isFinite(graph.end_time_ms) &&
    Number.isFinite(lastTimestamp) &&
    Math.abs(lastTimestamp - graph.end_time_ms) > graph.time_per_step / 2
  ) {
    timestamps.push(graph.end_time_ms)
  }

  return timestamps
}
