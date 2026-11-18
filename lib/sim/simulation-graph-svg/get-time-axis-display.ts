import type { AxisInfo } from "./simulation-graph-svg-shared"
import { formatNumber } from "./simulation-graph-svg-shared"

export type SimulationTimeUnit = "s" | "ms" | "us" | "ns" | "ps"
type TimeMs = number

const millisecondsPerUnit: Record<SimulationTimeUnit, number> = {
  s: 1000,
  ms: 1,
  us: 1e-3,
  ns: 1e-6,
  ps: 1e-9,
}

export function getTimeAxisDisplay({
  timeAxis,
  timeUnit,
}: {
  timeAxis: AxisInfo
  timeUnit: SimulationTimeUnit | "auto"
}): { timeAxis: AxisInfo; xAxisTitle: string } {
  const unit = timeUnit === "auto" ? getTimeUnit(timeAxis) : timeUnit
  if (unit === "ms") return { timeAxis, xAxisTitle: "Time (ms)" }

  return {
    timeAxis: {
      ...timeAxis,
      tickLabelOverrides: new Map<TimeMs, string>(
        timeAxis.ticks.map((timeMs) => [
          timeMs,
          formatNumber(timeMs / millisecondsPerUnit[unit]),
        ]),
      ),
    },
    xAxisTitle: `Time (${unit === "us" ? "µs" : unit})`,
  }
}

function getTimeUnit(timeAxis: AxisInfo): SimulationTimeUnit {
  const maximumTimeMs = Math.max(
    Math.abs(timeAxis.domainMin),
    Math.abs(timeAxis.domainMax),
  )
  if (maximumTimeMs >= 1000) return "s"
  if (maximumTimeMs >= 1 || maximumTimeMs === 0) return "ms"
  if (maximumTimeMs >= 1e-3) return "us"
  if (maximumTimeMs >= 1e-6) return "ns"
  return "ps"
}
