import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("mixed case and numbers baseline alignment", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 50,
      height: 40,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    // Test the specific text mentioned by user
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_mixed_case_numbers",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 1,
      text: "Smaqpy987",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
    },
    // Test various combinations
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_uppercase_lowercase",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 1,
      text: "Hello World",
      layer: "top",
      anchor_position: { x: 0, y: 5 },
      anchor_alignment: "center",
    },
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_numbers_lowercase",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 1,
      text: "123abc456",
      layer: "top",
      anchor_position: { x: 0, y: -5 },
      anchor_alignment: "center",
    },
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_all_types",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 1,
      text: "A1b2C3d4",
      layer: "top",
      anchor_position: { x: 0, y: -10 },
      anchor_alignment: "center",
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
