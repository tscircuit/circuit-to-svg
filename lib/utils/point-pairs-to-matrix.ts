import { type Matrix, compose, scale, translate } from "transformation-matrix"

type Point = { x: number; y: number }

export function pointPairsToMatrix(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
): Matrix {
  // Calculate the translation based on the first point pair (A -> A')
  const tx = a2.x - a1.x
  const ty = a2.y - a1.y

  // Calculate scaling factors using the distances between points
  const originalDistance = Math.sqrt((b1.x - a1.x) ** 2 + (b1.y - a1.y) ** 2)
  const transformedDistance = Math.sqrt((b2.x - a2.x) ** 2 + (b2.y - a2.y) ** 2)

  const a = transformedDistance / originalDistance

  // Create and compose the transformations
  const translateMatrix = translate(tx, ty)
  const scaleMatrix = scale(a, a)

  return compose(translateMatrix, scaleMatrix)
}
