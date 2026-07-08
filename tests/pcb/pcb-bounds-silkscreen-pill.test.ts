import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// pcb_silkscreen_pill is rendered but missing from getComprehensivePcbBounds'
// silkscreen handling, so it contributes nothing to the viewport and gets
// clipped.
const silkscreenPillWithMarker: AnyCircuitElement[] = [
  {
    type: "pcb_silkscreen_pill",
    pcb_silkscreen_pill_id: "pill_0",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    center: { x: 0, y: 0 },
    width: 10,
    height: 4,
  },
  // small marker pad so the scene has at least one counted element
  {
    type: "pcb_smtpad",
    shape: "rect",
    pcb_smtpad_id: "marker_pad",
    x: 0,
    y: 0,
    width: 0.2,
    height: 0.2,
    layer: "top",
  },
]

test.failing("getComprehensivePcbBounds includes a silkscreen pill", () => {
  const bounds = getComprehensivePcbBounds(silkscreenPillWithMarker)
  expect(bounds.minX).toBeCloseTo(-5, 6)
  expect(bounds.maxX).toBeCloseTo(5, 6)
  expect(bounds.minY).toBeCloseTo(-2, 6)
  expect(bounds.maxY).toBeCloseTo(2, 6)
})

test("silkscreen pill svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg(silkscreenPillWithMarker)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
