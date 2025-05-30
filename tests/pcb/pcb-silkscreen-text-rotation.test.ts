import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen text with rotation", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      center: { x: 3, y: 3 },
      width: 8,
      height: 8,
      subcircuit_id: "pcb_generic_component_0",
      material: "fr4",
      num_layers: 2,
      pcb_board_id: "pcb_board_0",
      thickness: 1,
      is_subcircuit: false,
    },
    // Horizontal text (0 degrees)
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "0° at (0,0)",
      ccw_rotation: 0,
    },
    // Add SMT pad to mark the anchor point for horizontal text
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "anchor_pad_0",
      layer: "top",
      x: 0,
      y: 0,
      width: 0.3,
      height: 0.3,
      shape: "rect",
    },

    // Vertical text (90 degrees)
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_1",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_generic_component_1",
      anchor_position: { x: 5, y: 0 },
      anchor_alignment: "center",
      text: "90° at (5,0)",
      ccw_rotation: 90,
    },
    // Add SMT pad to mark the anchor point for vertical text
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "anchor_pad_1",
      layer: "top",
      x: 5,
      y: 0,
      width: 0.3,
      height: 0.3,
      shape: "rect",
    },

    // Upside down text (180 degrees)
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_2",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_generic_component_2",
      anchor_position: { x: 0, y: 5 },
      anchor_alignment: "center",
      text: "180° at (0,5)",
      ccw_rotation: 180,
    },
    // Add SMT pad to mark the anchor point for upside down text
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "anchor_pad_2",
      layer: "top",
      x: 0,
      y: 5,
      width: 0.3,
      height: 0.3,
      shape: "rect",
    },

    // Diagonal text (45 degrees)
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_3",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_generic_component_3",
      anchor_position: { x: 5, y: 5 },
      anchor_alignment: "center",
      text: "45° at (5,5)",
      ccw_rotation: 45,
    },
    // Add SMT pad to mark the anchor point for diagonal text
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "anchor_pad_3",
      layer: "top",
      x: 5,
      y: 5,
      width: 0.3,
      height: 0.3,
      shape: "rect",
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
}, 20000)
