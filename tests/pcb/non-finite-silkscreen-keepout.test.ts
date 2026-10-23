import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib/index"
import type { AnyCircuitElement } from "circuit-json"

test("non-finite silkscreen font_size falls back to valid finite length", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_nan",
      pcb_component_id: "comp1",
      text: "TEST",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      // Pass NaN for font_size to simulate non-finite in-memory value
      font_size: Number.NaN,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_valid",
      pcb_component_id: "comp2",
      text: "VALID",
      layer: "top",
      anchor_position: { x: 5, y: 5 },
      font_size: 2,
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  // Must not emit font-size="NaN"
  expect(svg).not.toContain('font-size="NaN"')
  expect(svg).not.toContain("font-size='NaN'")
  // Must render valid finite text elements
  expect(svg).toContain('class="pcb-silkscreen-text')
  expect(svg).toContain("TEST")
  expect(svg).toContain("VALID")
})

test("non-finite circular keepout radius falls back to r=0", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout_nan",
      shape: "circle",
      center: { x: 0, y: 0 },
      // Pass NaN for radius to simulate non-finite in-memory value
      radius: Number.NaN,
      layers: ["top"],
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout_valid",
      shape: "circle",
      center: { x: 5, y: 5 },
      radius: 3,
      layers: ["top"],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  // Must not emit r="NaN"
  expect(svg).not.toContain('r="NaN"')
  expect(svg).not.toContain("r='NaN'")
  // The NaN keepout falls back to r="0"
  expect(svg).toContain('r="0"')
})
