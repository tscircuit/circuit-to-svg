import type { AxisInfo } from "./simulation-graph-svg-shared"
import { formatNumber } from "./simulation-graph-svg-shared"

export function formatValueWithUnit(value: number, unit: "V" | "A"): string {
  if (!Number.isFinite(value)) return `0 ${unit}`
  if (value === 0) return `0 ${unit}`

  const absValue = Math.abs(value)
  const prefixes = [
    { threshold: 1e6, factor: 1e6, prefix: "M" },
    { threshold: 1e3, factor: 1e3, prefix: "k" },
    { threshold: 1, factor: 1, prefix: "" },
    { threshold: 1e-3, factor: 1e-3, prefix: "m" },
    { threshold: 1e-6, factor: 1e-6, prefix: "µ" },
    { threshold: 1e-9, factor: 1e-9, prefix: "n" },
  ]
  const prefix =
    prefixes.find((candidate) => absValue >= candidate.threshold) ??
    prefixes[prefixes.length - 1]!
  const scaledValue = value / prefix.factor

  return `${formatScopeNumber(scaledValue)} ${prefix.prefix}${unit}`
}

export function formatDivs(value: number): string {
  return `${formatScopeNumber(value)} div`
}

function formatScopeNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"

  const absValue = Math.abs(value)
  const maximumFractionDigits =
    absValue >= 100 ? 0 : absValue >= 10 ? 1 : absValue >= 1 ? 2 : 3

  return Number.parseFloat(value.toFixed(maximumFractionDigits)).toString()
}

export function formatTickLabel(value: number, axis: AxisInfo): string {
  const overriddenLabel = axis.tickLabelOverrides?.get(value)
  if (overriddenLabel !== undefined) return overriddenLabel

  const { ticks } = axis
  if (ticks.length <= 1) return formatNumber(value)
  const span = ticks[ticks.length - 1]! - ticks[0]!
  if (!Number.isFinite(span) || span === 0) return formatNumber(value)

  const precision = getTickLabelPrecisionForSpan(span)
  const factor = 10 ** precision
  const rounded = Math.round(value * factor) / factor
  const fixed = rounded.toFixed(precision)
  return fixed
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "")
}

function getTickLabelPrecisionForSpan(span: number): number {
  if (span >= 100) return 0
  if (span >= 10) return 1
  if (span >= 1) return 2

  return 3
}
