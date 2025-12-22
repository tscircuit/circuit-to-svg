import type { Bounds } from "@tscircuit/math-utils"
import type { Point } from "circuit-json"
import { expandBounds } from "./expand-bounds"
import { toRectBounds } from "./to-rect-bounds"

export const addRectToBounds = (
  target: Bounds,
  center: Point | undefined,
  width: number | undefined,
  height: number | undefined,
): Bounds => {
  const rect = toRectBounds(center, width, height)
  return rect ? expandBounds(target, rect) : target
}
