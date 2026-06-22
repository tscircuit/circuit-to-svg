import type { ScaleFn } from "../simulation-graph-svg-shared"

export function createLinearScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): ScaleFn {
  if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax)) {
    const midpoint = (rangeMin + rangeMax) / 2
    return () => midpoint
  }

  const span = domainMax - domainMin
  if (Math.abs(span) < Number.EPSILON) {
    const midpoint = (rangeMin + rangeMax) / 2
    return () => midpoint
  }

  return (value: number) =>
    rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin)
}
