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
    dashLength !== undefined ? dashLength * scale : defaultDashLength
  const transformedDashGap =
    dashGap !== undefined ? dashGap * scale : defaultDashLength

  return `${transformedDashLength} ${transformedDashGap}`
}
