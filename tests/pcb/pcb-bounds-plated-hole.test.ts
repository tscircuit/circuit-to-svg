import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// getComprehensivePcbBounds has no pcb_plated_hole branch, so a plated hole
// falls into the generic point fallback and contributes a zero-size point —
// its copper pad extent is ignored and the rendered pad is clipped by the
// svg viewport.
const circleHole: AnyCircuitElement[] = [
  {
    type: "pcb_plated_hole",
    shape: "circle",
    x: 0,
    y: 0,
    outer_diameter: 10,
    hole_diameter: 5,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "plated_hole_circle",
  },
]

test.failing(
  "getComprehensivePcbBounds includes a circle plated hole's pad extent",
  () => {
    const bounds = getComprehensivePcbBounds(circleHole)
    expect(bounds.minX).toBeCloseTo(-5, 6)
    expect(bounds.maxX).toBeCloseTo(5, 6)
    expect(bounds.minY).toBeCloseTo(-5, 6)
    expect(bounds.maxY).toBeCloseTo(5, 6)
  },
)

test.failing(
  "getComprehensivePcbBounds includes a circular_hole_with_rect_pad's pad extent",
  () => {
    const bounds = getComprehensivePcbBounds([
      {
        type: "pcb_plated_hole",
        shape: "circular_hole_with_rect_pad",
        hole_shape: "circle",
        pad_shape: "rect",
        x: 0,
        y: 0,
        hole_diameter: 1.4,
        rect_pad_width: 12,
        rect_pad_height: 6,
        layers: ["top", "bottom"],
        pcb_plated_hole_id: "plated_hole_rect_pad",
        hole_offset_x: 0,
        hole_offset_y: 0,
      },
    ])
    expect(bounds.minX).toBeCloseTo(-6, 6)
    expect(bounds.maxX).toBeCloseTo(6, 6)
    expect(bounds.minY).toBeCloseTo(-3, 6)
    expect(bounds.maxY).toBeCloseTo(3, 6)
  },
)

test("plated hole svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg(circleHole)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
