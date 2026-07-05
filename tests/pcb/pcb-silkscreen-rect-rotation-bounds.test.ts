import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getPcbBoundsFromCircuitJson } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// A wide silkscreen rect rotated 90deg. The renderer rotates it (rotate(-90)),
// but getPcbBoundsFromCircuitJson measures the un-rotated width/height box, so
// the exported bounds are too small on the rotated axis and the shape gets
// clipped by the SVG viewport.
const wideRotatedRect: AnyCircuitElement[] = [
  {
    type: "pcb_silkscreen_rect",
    layer: "top",
    pcb_component_id: "pcb_component_0",
    pcb_silkscreen_rect_id: "rect_wide_90",
    center: { x: 0, y: 0 },
    width: 7.778,
    height: 1,
    stroke_width: 0.1,
    ccw_rotation: 90,
  },
]

// Rotating the 7.778 x 1 rect by 90deg swaps its extents: the true axis-aligned
// bounds are +/-0.5 in x and +/-3.889 in y.
test("getPcbBoundsFromCircuitJson accounts for a rotated pcb_silkscreen_rect", () => {
  const bounds = getPcbBoundsFromCircuitJson(wideRotatedRect)
  expect(bounds.minX).toBeCloseTo(-0.5, 6)
  expect(bounds.maxX).toBeCloseTo(0.5, 6)
  expect(bounds.minY).toBeCloseTo(-3.889, 6)
  expect(bounds.maxY).toBeCloseTo(3.889, 6)
})

test("wide rotated silkscreen rect is not clipped by the svg viewport", () => {
  const svg = convertCircuitJsonToPcbSvg(wideRotatedRect)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
