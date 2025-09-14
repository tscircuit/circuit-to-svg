import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("knockout silkscreen text", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      width: 12,
      height: 12,
      center: { x: 0, y: 0 },
      num_layers: 2,
      pcb_board_id: "pcb_board_0",
      thickness: 1.2,
      material: "fr1",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_center_1",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -3, y: -3 },
      anchor_alignment: "center",
      text: "center",
      is_knockout: true,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_center_2",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 3, y: 3 },
      anchor_alignment: "center",
      text: "center",
      is_knockout: true,
      knockout_padding: { left: 0, right: 0, top: 0, bottom: 0 },
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_center_0",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "center",
      is_knockout: true,
      knockout_padding: { left: 0.8, right: 0.8, top: 0.8, bottom: 0.8 },
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
