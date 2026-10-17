import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// The viewport must contain both the rotated rectangle and its stroke.
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

// The 0.1mm stroke extends the rotated shape by 0.05mm on each side.
test("getComprehensivePcbBounds accounts for a rotated pcb_silkscreen_rect", () => {
  const bounds = getComprehensivePcbBounds(wideRotatedRect)
  expect(bounds.minX).toBeCloseTo(-0.55, 6)
  expect(bounds.maxX).toBeCloseTo(0.55, 6)
  expect(bounds.minY).toBeCloseTo(-3.939, 6)
  expect(bounds.maxY).toBeCloseTo(3.939, 6)
})

test("wide rotated silkscreen rect is not clipped by the svg viewport", () => {
  const svg = convertCircuitJsonToPcbSvg(wideRotatedRect)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
