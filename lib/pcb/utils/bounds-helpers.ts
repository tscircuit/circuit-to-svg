import type { Bounds } from "@tscircuit/math-utils"

export const getEmptyBounds = (): Bounds => ({
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
})

export const expandBounds = (target: Bounds, source: Bounds): Bounds => ({
  minX: Math.min(target.minX, source.minX),
  minY: Math.min(target.minY, source.minY),
  maxX: Math.max(target.maxX, source.maxX),
  maxY: Math.max(target.maxY, source.maxY),
})

export const isFiniteBounds = (b: Bounds): boolean =>
  Number.isFinite(b.minX) &&
  Number.isFinite(b.minY) &&
  Number.isFinite(b.maxX) &&
  Number.isFinite(b.maxY)
