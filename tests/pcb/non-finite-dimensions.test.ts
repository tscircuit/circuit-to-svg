import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

// Regression for https://github.com/tscircuit/circuit-to-svg/issues/634
// and https://github.com/tscircuit/circuit-to-svg/issues/636
// Non-finite dimensions must never be written into SVG attributes:
// r="NaN" / font-size="NaN" are not valid SVG lengths and renderers
// silently discard the whole element.

const board = {
  type: "pcb_board",
  pcb_board_id: "board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
} as const

test("via with NaN hole diameter emits no NaN attributes", () => {
  const circuit: AnyCircuitElement[] = [
    board as any,
    {
      type: "pcb_via",
      pcb_via_id: "via_0",
      x: 5,
      y: 5,
      outer_diameter: 0.6,
      hole_diameter: Number.NaN,
      layers: ["top", "bottom"],
      from_layer: "top",
      to_layer: "bottom",
    } as any,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit)
  expect(svg).not.toContain("NaN")
  // copper outer circle still renders
  expect(svg).toContain("pcb-hole-outer")
})

test("plated hole with NaN hole diameter emits no NaN attributes", () => {
  const circuit: AnyCircuitElement[] = [
    board as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_0",
      shape: "circle",
      x: 0,
      y: 0,
      outer_diameter: 1.2,
      hole_diameter: Number.NaN,
      layers: ["top", "bottom"],
    } as any,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit)
  expect(svg).not.toContain("NaN")
  expect(svg).toContain("pcb-hole-outer")
})

test("silkscreen text with NaN font size renders without font-size=NaN", () => {
  const circuit: AnyCircuitElement[] = [
    board as any,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "silk_0",
      pcb_component_id: "comp_0",
      text: "hi",
      font: "tscircuit2024",
      font_size: Number.NaN,
      layer: "top",
      anchor_position: { x: 3, y: 3 },
      anchor_alignment: "center",
      ccw_rotation: 0,
    } as any,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit)
  expect(svg).not.toContain("NaN")
  expect(svg).toContain("hi")
})

test("circular keepout with NaN radius emits no NaN attributes", () => {
  const circuit: AnyCircuitElement[] = [
    board as any,
    {
      type: "pcb_keepout",
      pcb_keepout_id: "ko_0",
      shape: "circle",
      center: { x: 5, y: 5 },
      radius: Number.NaN,
      layers: ["top"],
    } as any,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit)
  expect(svg).not.toContain("NaN")
})
