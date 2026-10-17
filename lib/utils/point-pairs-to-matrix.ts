import {
  type Matrix,
  compose,
  rotate,
  scale,
  translate,
} from "transformation-matrix"

type Point = { x: number; y: number }

/** Map symbol-local points to circuit-world points (mm, +X right, +Y up),
 * preserving handedness with uniform scale and counterclockwise rotation.
 */
export function pointPairsToMatrix(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
): Matrix {
  // Calculate scaling factors using the distances between points
  const originalDistance = Math.sqrt((b1.x - a1.x) ** 2 + (b1.y - a1.y) ** 2)
  const transformedDistance = Math.sqrt((b2.x - a2.x) ** 2 + (b2.y - a2.y) ** 2)

  const a = transformedDistance / originalDistance

  const rotation =
    Math.atan2(b2.y - a2.y, b2.x - a2.x) - Math.atan2(b1.y - a1.y, b1.x - a1.x)

  // Move the local anchor to the origin before scaling and rotating, then
  // place it at its circuit-world position. Both matched pins stay attached.
  return compose(
    translate(a2.x, a2.y),
    rotate(rotation),
    scale(a, a),
    translate(-a1.x, -a1.y),
  )
}
