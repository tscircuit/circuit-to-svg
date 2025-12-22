import type { Bounds } from "@tscircuit/math-utils"
import type { Point } from "circuit-json"
import { expandBounds } from "./expand-bounds"
import { getEmptyBounds } from "./get-empty-bounds"
import { toRectBounds } from "./to-rect-bounds"

type BoundsMap = Map<string, Bounds>

export const addRectToBoundsWithId = (
  target: Bounds,
  center: Point | undefined,
  width: number | undefined,
  height: number | undefined,
  opts: { id?: string; byId?: BoundsMap; overall?: Bounds },
): {
  bounds: Bounds
  overall: Bounds
} => {
  const rect = toRectBounds(center, width, height)
  if (!rect) return { bounds: target, overall: opts.overall ?? target }

  const nextBounds = expandBounds(target, rect)
  const nextOverall = expandBounds(opts.overall ?? getEmptyBounds(), rect)

  if (opts.id && opts.byId) {
    const existing = opts.byId.get(opts.id) ?? getEmptyBounds()
    opts.byId.set(opts.id, expandBounds(existing, rect))
  }

  return { bounds: nextBounds, overall: nextOverall }
}
