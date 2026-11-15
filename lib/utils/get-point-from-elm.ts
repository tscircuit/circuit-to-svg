import type { Point } from "circuit-json"

export function getOutlineBounds(outline: Point[] | undefined):
  | {
      center: { x: number; y: number }
      width: number
      height: number
    }
  | undefined {
  if (
    !Array.isArray(outline) ||
    outline.length < 3 ||
    !outline.every(
      (point) =>
        point &&
        typeof point.x === "number" &&
        Number.isFinite(point.x) &&
        typeof point.y === "number" &&
        Number.isFinite(point.y),
    )
  ) {
    return undefined
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of outline) {
    if (point.x < minX) minX = point.x
    if (point.y < minY) minY = point.y
    if (point.x > maxX) maxX = point.x
    if (point.y > maxY) maxY = point.y
  }

  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function getPointFromElm(
  elm:
    | { anchor_position?: Point; center?: Point; outline?: Point[] }
    | undefined,
): { x: number; y: number } | undefined {
  const candidate = elm?.anchor_position ?? elm?.center
  if (
    candidate &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number"
  ) {
    return { x: candidate.x, y: candidate.y }
  }
  return getOutlineBounds(elm?.outline)?.center
}
