import type { Point } from "circuit-json"
import type { Bounds } from "@tscircuit/math-utils"

export const toRectBounds = (
  center: Point | undefined,
  width: number | undefined,
  height: number | undefined,
): Bounds | undefined => {
  if (!center) return undefined
  if (
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  )
    return undefined
  const centerX = center.x
  const centerY = center.y
  const halfWidth = width / 2
  const halfHeight = height / 2
  return {
    minX: centerX - halfWidth,
    minY: centerY - halfHeight,
    maxX: centerX + halfWidth,
    maxY: centerY + halfHeight,
  }
}
