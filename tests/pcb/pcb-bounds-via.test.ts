import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// getComprehensivePcbBounds has no pcb_via branch, so a via falls into the
// generic point fallback and contributes a zero-size point — its copper
// extent (outer_diameter) is ignored and the rendered via is clipped by the
// svg viewport.
const via: AnyCircuitElement[] = [
  {
    type: "pcb_via",
    pcb_via_id: "via_0",
    x: 0,
    y: 0,
    outer_diameter: 8,
    hole_diameter: 4,
    layers: ["top", "bottom"],
    from_layer: "top",
    to_layer: "bottom",
  },
]

test("getComprehensivePcbBounds includes a via's outer diameter", () => {
  const bounds = getComprehensivePcbBounds(via)
  expect(bounds.minX).toBeCloseTo(-4, 6)
  expect(bounds.maxX).toBeCloseTo(4, 6)
  expect(bounds.minY).toBeCloseTo(-4, 6)
  expect(bounds.maxY).toBeCloseTo(4, 6)
})

test("via svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg(via)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
