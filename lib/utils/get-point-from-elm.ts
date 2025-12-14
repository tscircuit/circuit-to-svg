import type { Point } from "circuit-json"

export function getPointFromElm(
  elm: { anchor_position?: Point; center?: Point } | undefined,
): { x: number; y: number } | undefined {
  const candidate = elm?.anchor_position ?? elm?.center
  if (
    candidate &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number"
  ) {
    return { x: candidate.x, y: candidate.y }
  }
  return undefined
}
