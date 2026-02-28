import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen text - all features work on non-knockout text", () => {
  const allFeatures = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 30,
      height: 30,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    // Top layer, rotated, various anchors
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_top_rotated",
      font: "tscircuit2024",
      font_size: 0.7,
      pcb_component_id: "comp_0",
      anchor_position: { x: -8, y: -8 },
      anchor_alignment: "top_left",
      text: "TOP-LEFT",
      is_knockout: false,
      ccw_rotation: 30,
    },
    // Bottom layer
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "text_bottom",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_1",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "BOTTOM",
      is_knockout: false,
    },
    // Multi-line
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_multiline",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_2",
      anchor_position: { x: 8, y: 8 },
      anchor_alignment: "bottom_right",
      text: "MULTI\nLINE",
      is_knockout: false,
    },
  ])

  expect(allFeatures).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-text-non-knockout-all-features",
  )
})
