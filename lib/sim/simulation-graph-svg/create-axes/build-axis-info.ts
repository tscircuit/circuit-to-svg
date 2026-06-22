import type { SimulationExperiment } from "circuit-json"
import {
  type AxisInfo,
  type SimulationTransientGraph,
  formatNumber,
} from "../simulation-graph-svg-shared"

export function buildAxisInfo(
  values: number[],
  applyPadding = false,
): AxisInfo {
  if (values.length === 0) {
    return {
      domainMin: 0,
      domainMax: 1,
      ticks: [0, 1],
    }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (min === max) {
    const offset = min === 0 ? 1 : Math.abs(min) * 0.1 || 1
    return {
      domainMin: min - offset,
      domainMax: min + offset,
      ticks: [min - offset, min, min + offset],
    }
  }

  const ticks = generateTickValues(min, max)
  const safeTicks = ticks.length > 0 ? [...ticks] : [min, max]
  let domainMin = safeTicks[0]!
  let domainMax = safeTicks[safeTicks.length - 1]!

  if (applyPadding && safeTicks.length > 1) {
    const tickStep = Math.abs(safeTicks[1]! - safeTicks[0]!)
    const paddingToleranceRatio = 0.1

    if (min < domainMin + tickStep * paddingToleranceRatio) {
      domainMin -= tickStep
      safeTicks.unshift(domainMin)
    }
    if (max > domainMax - tickStep * paddingToleranceRatio) {
      domainMax += tickStep
      safeTicks.push(domainMax)
    }
  }

  return { domainMin, domainMax, ticks: safeTicks }
}

export function buildTimeAxisInfo({
  values,
  graphs,
  experiment,
}: {
  values: number[]
  graphs: SimulationTransientGraph[]
  experiment?: SimulationExperiment
}): AxisInfo {
  const experimentStartTimeMs = getFiniteNumber(
    (experiment as { start_time_ms?: number } | undefined)?.start_time_ms,
  )
  const experimentEndTimeMs = getFiniteNumber(
    (experiment as { end_time_ms?: number } | undefined)?.end_time_ms,
  )

  const startTimes = graphs
    .map((graph) => getFiniteNumber(graph.start_time_ms))
    .filter((value): value is number => value !== undefined)
  const endTimes = graphs
    .map((graph) => getFiniteNumber(graph.end_time_ms))
    .filter((value): value is number => value !== undefined)

  const domainMin =
    experimentStartTimeMs ??
    (startTimes.length > 0 ? Math.min(...startTimes) : undefined)
  const domainMax =
    experimentEndTimeMs ??
    (endTimes.length > 0 ? Math.max(...endTimes) : undefined)

  if (
    domainMin === undefined ||
    domainMax === undefined ||
    domainMin === domainMax
  ) {
    return buildAxisInfo(values)
  }

  const min = Math.min(domainMin, domainMax)
  const max = Math.max(domainMin, domainMax)
  const span = max - min
  const minimumEndpointTickDistance = span * 0.12
  const interiorTicks = generateTickValues(min, max).filter(
    (tick) =>
      tick > min + minimumEndpointTickDistance &&
      tick < max - minimumEndpointTickDistance,
  )
  const ticks = sortAndDedupeApproximateNumbers([min, ...interiorTicks, max])

  return {
    domainMin: min,
    domainMax: max,
    ticks,
    tickLabelOverrides: new Map([
      [min, formatNumber(min)],
      [max, formatNumber(max)],
    ]),
  }
}

function getFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function sortAndDedupeApproximateNumbers(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const deduped: number[] = []

  for (const value of sorted) {
    const previous = deduped[deduped.length - 1]
    if (previous === undefined || Math.abs(value - previous) > 1e-12) {
      deduped.push(value)
    }
  }

  return deduped
}

function generateTickValues(min: number, max: number, desired = 6): number[] {
  const span = max - min
  if (!Number.isFinite(span) || span <= Number.EPSILON) {
    return [min, max]
  }

  const step = niceStep(span / Math.max(1, desired - 1))
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const values: number[] = []

  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    values.push(Number.parseFloat(value.toPrecision(12)))
  }

  return values
}

function niceStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 1

  const exponent = Math.floor(Math.log10(step))
  const fraction = step / 10 ** exponent

  let niceFraction: number
  if (fraction <= 1) niceFraction = 1
  else if (fraction <= 2) niceFraction = 2
  else if (fraction <= 5) niceFraction = 5
  else niceFraction = 10

  return niceFraction * 10 ** exponent
}
