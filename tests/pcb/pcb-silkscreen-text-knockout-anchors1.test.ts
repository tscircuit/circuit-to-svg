import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - all 9-point anchor alignments", () => {
  const allAnchors = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 40,
      height: 40,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    // Top-left anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_top_left",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_0",
      anchor_position: { x: -15, y: -15 },
      anchor_alignment: "top_left",
      text: "TL",
      is_knockout: true,
    },
    // Top-center anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_top_center",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_1",
      anchor_position: { x: 0, y: -15 },
      anchor_alignment: "top_center",
      text: "TC",
      is_knockout: true,
    },
    // Top-right anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_top_right",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_2",
      anchor_position: { x: 15, y: -15 },
      anchor_alignment: "top_right",
      text: "TR",
      is_knockout: true,
    },
    // Center-left anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_center_left",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_3",
      anchor_position: { x: -15, y: 0 },
      anchor_alignment: "center_left",
      text: "CL",
      is_knockout: true,
    },
    // Center anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_center",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_4",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "C",
      is_knockout: true,
    },
    // Center-right anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_center_right",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_5",
      anchor_position: { x: 15, y: 0 },
      anchor_alignment: "center_right",
      text: "CR",
      is_knockout: true,
    },
    // Bottom-left anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_bottom_left",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_6",
      anchor_position: { x: -15, y: 15 },
      anchor_alignment: "bottom_left",
      text: "BL",
      is_knockout: true,
    },
    // Bottom-center anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_bottom_center",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_7",
      anchor_position: { x: 0, y: 15 },
      anchor_alignment: "bottom_center",
      text: "BC",
      is_knockout: true,
    },
    // Bottom-right anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_bottom_right",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_8",
      anchor_position: { x: 15, y: 15 },
      anchor_alignment: "bottom_right",
      text: "BR",
      is_knockout: true,
    },
  ])

  expect(allAnchors).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-all-anchors",
  )
})
