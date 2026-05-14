import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text honors anchor alignment", () => {
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
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_top_left",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -5, y: -2 },
      anchor_alignment: "top_left",
      text: "TOP LEFT",
      is_knockout: true,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_bottom_right",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 5, y: 2 },
      anchor_alignment: "bottom_right",
      text: "BOTTOM RIGHT",
      is_knockout: true,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_bottom_left",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 5 },
      anchor_alignment: "bottom_left",
      text: "BOTTOM LEFT",
      is_knockout: true,
    },
  ])

  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-anchor-alignment",
  )
})
