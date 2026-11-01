import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("non-finite silkscreen font_size and keepout radius do not emit NaN", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_1",
      pcb_component_id: "comp_1",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: Number.NaN,
      layer: "top",
      text: "R1",
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout_1",
      shape: "circle",
      center: { x: 1, y: 1 },
      radius: Number.NaN,
      layers: ["top"],
    },
  ])

  expect(svg).not.toContain("NaN")
  expect(svg).toContain('data-pcb-silkscreen-text-id="text_1"')
  expect(svg).toContain('data-pcb-keepout-id="keepout_1"')
})
