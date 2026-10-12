import { expect, test } from "bun:test"
import type { PcbVia } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("PCB layer views draw blind and buried vias only on their physical layers", () => {
  const throughHoleVia: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "through",
    x: 0,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["top", "inner1", "inner2", "bottom"],
  }

  const topBlindVia: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "top_blind",
    x: 0,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["top", "inner1"],
  }

  const buriedVia: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "buried",
    x: 0,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["inner1", "inner2"],
  }

  const bottomBlindVia: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "bottom_blind",
    x: 0,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["inner2", "bottom"],
  }

  const isVisible = (via: PcbVia, options?: { layer?: string }) => {
    const svg = convertCircuitJsonToPcbSvg([via], options as any)
    return svg.includes('class="pcb-hole-outer"')
  }

  // 1. Through-hole via should be visible on all layers and overview
  expect(isVisible(throughHoleVia, { layer: "top" })).toBe(true)
  expect(isVisible(throughHoleVia, { layer: "inner1" })).toBe(true)
  expect(isVisible(throughHoleVia, { layer: "inner2" })).toBe(true)
  expect(isVisible(throughHoleVia, { layer: "bottom" })).toBe(true)
  expect(isVisible(throughHoleVia)).toBe(true)

  // 2. Top-blind via (top, inner1) should only be visible on top and inner1
  expect(isVisible(topBlindVia, { layer: "top" })).toBe(true)
  expect(isVisible(topBlindVia, { layer: "inner1" })).toBe(true)
  expect(isVisible(topBlindVia, { layer: "inner2" })).toBe(false)
  expect(isVisible(topBlindVia, { layer: "bottom" })).toBe(false)
  expect(isVisible(topBlindVia)).toBe(true)

  // 3. Buried via (inner1, inner2) should only be visible on inner1 and inner2
  expect(isVisible(buriedVia, { layer: "top" })).toBe(false)
  expect(isVisible(buriedVia, { layer: "inner1" })).toBe(true)
  expect(isVisible(buriedVia, { layer: "inner2" })).toBe(true)
  expect(isVisible(buriedVia, { layer: "bottom" })).toBe(false)
  expect(isVisible(buriedVia)).toBe(true)

  // 4. Bottom-blind via (inner2, bottom) should only be visible on inner2 and bottom
  expect(isVisible(bottomBlindVia, { layer: "top" })).toBe(false)
  expect(isVisible(bottomBlindVia, { layer: "inner1" })).toBe(false)
  expect(isVisible(bottomBlindVia, { layer: "inner2" })).toBe(true)
  expect(isVisible(bottomBlindVia, { layer: "bottom" })).toBe(true)
  expect(isVisible(bottomBlindVia)).toBe(true)
})
