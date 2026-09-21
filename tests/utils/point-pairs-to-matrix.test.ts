import { expect, test } from "bun:test"
import { pointPairsToMatrix } from "lib/utils/point-pairs-to-matrix"
import { applyToPoint } from "transformation-matrix"

test("anchors both symbol pins when scaling about a nonzero origin", () => {
  for (const vertical of [false, true]) {
    for (const factor of [0.5, 1, 2, 4]) {
      const a = { x: 1.3, y: -0.2 }
      const b = vertical ? { x: 1.3, y: 1.8 } : { x: 3.3, y: -0.2 }
      const targetA = { x: -5, y: 7 }
      const targetB = {
        x: targetA.x + factor * (b.x - a.x),
        y: targetA.y + factor * (b.y - a.y),
      }
      for (const reverse of [false, true]) {
        const matrix = reverse
          ? pointPairsToMatrix(b, targetB, a, targetA)
          : pointPairsToMatrix(a, targetA, b, targetB)
        for (const [source, target] of [
          [a, targetA],
          [b, targetB],
        ] as const) {
          const result = applyToPoint(matrix, source)
          expect(result.x).toBeCloseTo(target.x, 10)
          expect(result.y).toBeCloseTo(target.y, 10)
        }
      }
    }
  }
})
