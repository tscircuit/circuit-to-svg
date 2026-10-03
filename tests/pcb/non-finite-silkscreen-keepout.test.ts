import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

test("non-finite silkscreen font_size and keepout radius degrade to valid SVG lengths without NaN (tscircuit/circuit-to-svg#636)", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 50,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_nan",
      pcb_component_id: "comp_1",
      anchor_alignment: "center",
      text: "hello",
      font_size: Number.NaN,
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      font: "tscircuit2024",
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout_nan",
      shape: "circle",
      center: { x: 5, y: 5 },
      radius: Number.NaN,
      layers: ["top"],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)
  expect(svg).not.toContain('font-size="NaN"')
  expect(svg).not.toContain('r="NaN"')
  expect(svg).toContain('class="pcb-silkscreen-text')
  expect(svg).toContain('class="pcb-keepout')
})
