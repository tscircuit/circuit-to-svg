import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib/pcb/convert-circuit-json-to-pcb-svg"
import type { AnyCircuitElement } from "circuit-json"

test("non-finite silkscreen font_size and keepout radius render without NaN (#636)", () => {
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
      pcb_silkscreen_text_id: "text1",
      text: "hi",
      anchor_position: { x: 3, y: 3 },
      font_size: Number.NaN,
      layer: "top",
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout1",
      shape: "circle",
      center: { x: 5, y: 5 },
      radius: Number.NaN,
      layers: ["top"],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).not.toContain("NaN")
  expect(svg).toContain('class="pcb-silkscreen-text')
  expect(svg).toContain('class="pcb-keepout pcb-keepout-circle')
})
