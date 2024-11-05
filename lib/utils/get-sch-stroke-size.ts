import type { Matrix } from "transformation-matrix"

// 0.02mm -> 2px
export const getSchStrokeSize = (transform: Matrix) => {
  return Math.abs(transform.a) * 0.02
}
