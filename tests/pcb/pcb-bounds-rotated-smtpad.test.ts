import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// The smtpad renderer rotates rotated_rect and rotated_pill pads via
// rotate(-ccw_rotation), but getComprehensivePcbBounds measures rotated_rect
// as an un-rotated width/height box and drops rotated_pill entirely, so
// rotated copper can be clipped by the svg viewport.
const rotatedRectPad: AnyCircuitElement[] = [
  {
    type: "pcb_smtpad",
    shape: "rotated_rect",
    pcb_smtpad_id: "rotated_rect_pad",
    x: 0,
    y: 0,
    width: 4,
    height: 0.5,
    ccw_rotation: 90,
    layer: "top",
  },
]

const rotatedPillPad: AnyCircuitElement[] = [
  {
    type: "pcb_smtpad",
    shape: "rotated_pill",
    pcb_smtpad_id: "rotated_pill_pad",
    x: 0,
    y: 0,
    width: 6,
    height: 1,
    radius: 0.5,
    ccw_rotation: 90,
    layer: "top",
  },
]

// Rotating the 4 x 0.5 pad by 90deg swaps its extents.
test.failing(
  "getComprehensivePcbBounds accounts for a rotated_rect smtpad's rotation",
  () => {
    const bounds = getComprehensivePcbBounds(rotatedRectPad)
    expect(bounds.minX).toBeCloseTo(-0.25, 6)
    expect(bounds.maxX).toBeCloseTo(0.25, 6)
    expect(bounds.minY).toBeCloseTo(-2, 6)
    expect(bounds.maxY).toBeCloseTo(2, 6)
  },
)

test.failing("getComprehensivePcbBounds includes a rotated_pill smtpad", () => {
  const bounds = getComprehensivePcbBounds(rotatedPillPad)
  expect(bounds.minX).toBeCloseTo(-0.5, 6)
  expect(bounds.maxX).toBeCloseTo(0.5, 6)
  expect(bounds.minY).toBeCloseTo(-3, 6)
  expect(bounds.maxY).toBeCloseTo(3, 6)
})

test("rotated smtpads svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg([
    { ...rotatedRectPad[0]!, x: -2 } as AnyCircuitElement,
    { ...rotatedPillPad[0]!, x: 2 } as AnyCircuitElement,
  ])
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
