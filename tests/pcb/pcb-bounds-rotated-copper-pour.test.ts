import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// The copper pour renderer rotates a rect pour via its `rotation` field, but
// getComprehensivePcbBounds measures the pour as an un-rotated width/height
// box, so a rotated rect pour can be clipped by the svg viewport.
const rotatedRectPour: AnyCircuitElement[] = [
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "rotated_rect_pour",
    shape: "rect",
    center: { x: 0, y: 0 },
    width: 8,
    height: 1,
    rotation: 90,
    layer: "top",
  } as AnyCircuitElement,
]

// Rotating the 8 x 1 pour by 90deg swaps its extents.
test("getComprehensivePcbBounds accounts for a rotated rect copper pour", () => {
  const bounds = getComprehensivePcbBounds(rotatedRectPour)
  expect(bounds.minX).toBeCloseTo(-0.5, 6)
  expect(bounds.maxX).toBeCloseTo(0.5, 6)
  expect(bounds.minY).toBeCloseTo(-4, 6)
  expect(bounds.maxY).toBeCloseTo(4, 6)
})

test("rotated copper pour svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg(rotatedRectPour)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
