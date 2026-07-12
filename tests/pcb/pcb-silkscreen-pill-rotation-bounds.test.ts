import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// A wide silkscreen pill rotated 90deg. The renderer rotates it (rotate(-90)),
// but getComprehensivePcbBounds measured the un-rotated width/height box, so the
// exported bounds were too small on the rotated axis and the shape got clipped
// by the SVG viewport.
const wideRotatedPill: AnyCircuitElement[] = [
  {
    type: "pcb_silkscreen_pill",
    layer: "top",
    pcb_component_id: "pcb_component_0",
    pcb_silkscreen_pill_id: "pill_wide_90",
    center: { x: 0, y: 0 },
    width: 7.778,
    height: 1,
    ccw_rotation: 90,
  },
]

// Rotating the 7.778 x 1 pill by 90deg swaps its extents: the true axis-aligned
// bounds are +/-0.5 in x and +/-3.889 in y.
test("getComprehensivePcbBounds accounts for a rotated pcb_silkscreen_pill", () => {
  const bounds = getComprehensivePcbBounds(wideRotatedPill)
  expect(bounds.minX).toBeCloseTo(-0.5, 6)
  expect(bounds.maxX).toBeCloseTo(0.5, 6)
  expect(bounds.minY).toBeCloseTo(-3.889, 6)
  expect(bounds.maxY).toBeCloseTo(3.889, 6)
})

test("wide rotated silkscreen pill is not clipped by the svg viewport", () => {
  const svg = convertCircuitJsonToPcbSvg(wideRotatedPill)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
