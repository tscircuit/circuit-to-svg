import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// getComprehensivePcbBounds has no pcb_hole branch, so a plain (non-plated)
// hole falls into the generic point fallback and contributes a zero-size
// point — its drilled extent (hole_diameter / hole_width x hole_height) is
// ignored and the rendered hole is clipped by the svg viewport.
const circleHole: AnyCircuitElement[] = [
  {
    type: "pcb_hole",
    pcb_hole_id: "hole_circle",
    hole_shape: "circle",
    hole_diameter: 6,
    x: 0,
    y: 0,
  },
]

const ovalHole: AnyCircuitElement[] = [
  {
    type: "pcb_hole",
    pcb_hole_id: "hole_oval",
    hole_shape: "oval",
    hole_width: 8,
    hole_height: 2,
    x: 0,
    y: 0,
  },
]

const rotatedPillHole: AnyCircuitElement[] = [
  {
    type: "pcb_hole",
    pcb_hole_id: "hole_rotated_pill",
    hole_shape: "rotated_pill",
    hole_width: 8,
    hole_height: 2,
    ccw_rotation: 90,
    x: 0,
    y: 0,
  } as AnyCircuitElement,
]

test("getComprehensivePcbBounds includes a circle hole's diameter", () => {
  const bounds = getComprehensivePcbBounds(circleHole)
  expect(bounds.minX).toBeCloseTo(-3, 6)
  expect(bounds.maxX).toBeCloseTo(3, 6)
  expect(bounds.minY).toBeCloseTo(-3, 6)
  expect(bounds.maxY).toBeCloseTo(3, 6)
})

test("getComprehensivePcbBounds includes an oval hole's extent", () => {
  const bounds = getComprehensivePcbBounds(ovalHole)
  expect(bounds.minX).toBeCloseTo(-4, 6)
  expect(bounds.maxX).toBeCloseTo(4, 6)
  expect(bounds.minY).toBeCloseTo(-1, 6)
  expect(bounds.maxY).toBeCloseTo(1, 6)
})

// Rotating the 8 x 2 pill by 90deg swaps its extents.
test("getComprehensivePcbBounds includes a rotated_pill hole", () => {
  const bounds = getComprehensivePcbBounds(rotatedPillHole)
  expect(bounds.minX).toBeCloseTo(-1, 6)
  expect(bounds.maxX).toBeCloseTo(1, 6)
  expect(bounds.minY).toBeCloseTo(-4, 6)
  expect(bounds.maxY).toBeCloseTo(4, 6)
})

test("hole svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg([
    ...circleHole,
    ...ovalHole,
    ...rotatedPillHole,
  ])
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
