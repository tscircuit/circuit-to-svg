import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen text with rotation", () => {
  const result = convertCircuitJsonToPcbSvg([
    // Horizontal text (0 degrees)
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "Horizontal Text",
      ccw_rotation: 0,
    },
    // Vertical text (90 degrees)
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_1",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_1",
      anchor_position: { x: 5, y: 0 },
      anchor_alignment: "center",
      text: "Vertical Text",
      ccw_rotation: 90,
    },
    // Upside down text (180 degrees)
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_2",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_2",
      anchor_position: { x: 0, y: 5 },
      anchor_alignment: "center",
      text: "Upside Down Text",
      ccw_rotation: 180,
    },
    // Diagonal text (45 degrees)
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_3",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_3",
      anchor_position: { x: 5, y: 5 },
      anchor_alignment: "center",
      text: "Diagonal Text",
      ccw_rotation: 45,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
