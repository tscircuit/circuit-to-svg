import type { Bounds } from "@tscircuit/math-utils"

export const isFiniteBounds = (b: Bounds): boolean =>
  Number.isFinite(b.minX) &&
  Number.isFinite(b.minY) &&
  Number.isFinite(b.maxX) &&
  Number.isFinite(b.maxY)

