import type { Matrix } from "transformation-matrix"

export function getSchematicStrokeDasharray({
  isDashed,
  dashLength,
  dashGap,
  strokeWidth,
  transform,
}: {
  isDashed?: boolean
  dashLength?: number
  dashGap?: number
  strokeWidth: number
  transform: Matrix
}): string | undefined {
  if (!isDashed) return undefined

  const scale = Math.abs(transform.a)
  const defaultDashLength = strokeWidth * scale * 3
  const transformedDashLength =
    typeof dashLength === "number" &&
    Number.isFinite(dashLength) &&
    dashLength > 0
      ? dashLength * scale
      : defaultDashLength
  const transformedDashGap =
    typeof dashGap === "number" && Number.isFinite(dashGap) && dashGap > 0
      ? dashGap * scale
      : defaultDashLength

  return `${transformedDashLength} ${transformedDashGap}`
}
