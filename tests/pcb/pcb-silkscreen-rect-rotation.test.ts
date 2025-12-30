import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen rect with rotation", () => {
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
    // Horizontal rect (0 degrees)
    {
      type: "pcb_silkscreen_rect",
      layer: "top" as const,
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_rect_id: "rect_0",
      center: { x: 0, y: 0 },
      width: 2,
      height: 1,
      stroke_width: 0.1,
      ccw_rotation: 0,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_0",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_component_1",
      anchor_position: { x: 0, y: -0.8 },
      anchor_alignment: "center",
      text: "0°",
    },
    // Add SMT pad to mark the center point for horizontal rect
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

    // Vertical rect (90 degrees)
    {
      type: "pcb_silkscreen_rect",
      layer: "top" as const,
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_rect_id: "rect_90",
      center: { x: 5, y: 0 },
      width: 2,
      height: 1,
      stroke_width: 0.1,
      ccw_rotation: 90,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_90",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_component_2",
      anchor_position: { x: 5, y: 1.5 },
      anchor_alignment: "center",
      text: "90°",
    },
    // Add SMT pad to mark the center point for vertical rect
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "anchor_pad_90",
      layer: "top",
      x: 5,
      y: 0,
      width: 0.3,
      height: 0.3,
      shape: "rect",
    },

    // Upside down rect (180 degrees)
    {
      type: "pcb_silkscreen_rect",
      layer: "top" as const,
      pcb_component_id: "pcb_component_3",
      pcb_silkscreen_rect_id: "rect_180",
      center: { x: 0, y: 5 },
      width: 2,
      height: 1,
      stroke_width: 0.1,
      ccw_rotation: 180,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_180",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_component_3",
      anchor_position: { x: 0, y: 5.8 },
      anchor_alignment: "center",
      text: "180°",
    },
    // Add SMT pad to mark the center point for upside down rect
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "anchor_pad_180",
      layer: "top",
      x: 0,
      y: 5,
      width: 0.3,
      height: 0.3,
      shape: "rect",
    },

    // Diagonal rect (45 degrees)
    {
      type: "pcb_silkscreen_rect",
      layer: "top" as const,
      pcb_component_id: "pcb_component_4",
      pcb_silkscreen_rect_id: "rect_45",
      center: { x: 5, y: 5 },
      width: 2,
      height: 1,
      stroke_width: 0.1,
      ccw_rotation: 45,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_45",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_component_4",
      anchor_position: { x: 5, y: 6.2 },
      anchor_alignment: "center",
      text: "45°",
    },
    // Add SMT pad to mark the center point for diagonal rect
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "anchor_pad_45",
      layer: "top",
      x: 5,
      y: 5,
      width: 0.3,
      height: 0.3,
      shape: "rect",
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
