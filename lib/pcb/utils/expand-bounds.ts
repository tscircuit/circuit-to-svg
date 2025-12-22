import type { Bounds } from "@tscircuit/math-utils"

export const expandBounds = (target: Bounds, source: Bounds): Bounds => ({
  minX: Math.min(target.minX, source.minX),
  minY: Math.min(target.minY, source.minY),
  maxX: Math.max(target.maxX, source.maxX),
  maxY: Math.max(target.maxY, source.maxY),
})

