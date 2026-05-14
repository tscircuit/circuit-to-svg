import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("copper knockout text honors anchor alignment", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 24,
      height: 16,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "pcb_copper_text_top_left",
      pcb_component_id: "pcb_generic_component_0",
      font: "tscircuit2024",
      font_size: 1,
      text: "TOP LEFT",
      layer: "top",
      anchor_position: { x: -5, y: -2 },
      anchor_alignment: "top_left",
      is_knockout: true,
    },
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "pcb_copper_text_bottom_right",
      pcb_component_id: "pcb_generic_component_0",
      font: "tscircuit2024",
      font_size: 1,
      text: "BOTTOM RIGHT",
      layer: "top",
      anchor_position: { x: 5, y: 2 },
      anchor_alignment: "bottom_right",
      is_knockout: true,
    },
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "pcb_copper_text_bottom_left",
      pcb_component_id: "pcb_generic_component_0",
      font: "tscircuit2024",
      font_size: 1,
      text: "BOTTOM LEFT",
      layer: "bottom",
      anchor_position: { x: 0, y: 5 },
      anchor_alignment: "bottom_left",
      is_knockout: true,
    },
  ])

  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "copper-knockout-anchor-alignment",
  )
})
