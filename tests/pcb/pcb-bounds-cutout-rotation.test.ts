import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// The pcb_cutout renderer rotates a rect cutout via its `rotation` field, but
// getComprehensivePcbBounds measures the cutout as an un-rotated width/height
// box, so a rotated rect cutout can be clipped by the svg viewport.
const rotatedRectCutout: AnyCircuitElement[] = [
  {
    type: "pcb_cutout",
    pcb_cutout_id: "cutout_rotated_rect",
    shape: "rect",
    center: { x: 0, y: 0 },
    width: 8,
    height: 1,
    rotation: 90,
  } as AnyCircuitElement,
]

// Rotating the 8 x 1 cutout by 90deg swaps its extents.
test.failing(
  "getComprehensivePcbBounds accounts for a rotated rect cutout",
  () => {
    const bounds = getComprehensivePcbBounds(rotatedRectCutout)
    expect(bounds.minX).toBeCloseTo(-0.5, 6)
    expect(bounds.maxX).toBeCloseTo(0.5, 6)
    expect(bounds.minY).toBeCloseTo(-4, 6)
    expect(bounds.maxY).toBeCloseTo(4, 6)
  },
)

test("rotated cutout svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg(rotatedRectCutout)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
