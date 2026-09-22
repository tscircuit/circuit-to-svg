import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("non-finite silkscreen font_size and keepout radius degrade to valid SVG lengths", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 40,
      height: 40,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_nan",
      text: "HELLO",
      font_size: Number.NaN,
      anchor_position: { x: 0, y: 0 },
      layer: "top",
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout_nan",
      shape: "circle",
      center: { x: 5, y: 5 },
      radius: Number.NaN,
      layers: ["top"],
    },
  ])

  // Must not contain invalid NaN attribute lengths
  expect(result).not.toContain('font-size="NaN"')
  expect(result).not.toContain('r="NaN"')
  expect(result).toContain('class="pcb-silkscreen-text')
})
