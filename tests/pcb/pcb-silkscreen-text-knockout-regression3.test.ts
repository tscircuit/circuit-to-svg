import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen text - mixed knockout and non-knockout on same board", () => {
  const mixed = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 35,
      height: 12,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    // Regular text
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_regular_1",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_0",
      anchor_position: { x: -10, y: -2 },
      anchor_alignment: "center",
      text: "REG1",
      is_knockout: false,
    },
    // Knockout text
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_knockout_1",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_1",
      anchor_position: { x: 0, y: -2 },
      anchor_alignment: "center",
      text: "KO1",
      is_knockout: true,
    },
    // Regular text (is_knockout omitted)
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_regular_2",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_2",
      anchor_position: { x: 10, y: -2 },
      anchor_alignment: "center",
      text: "REG2",
      // is_knockout omitted
    },
    // Knockout text with rotation
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_knockout_2",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_3",
      anchor_position: { x: -5, y: 3 },
      anchor_alignment: "center",
      text: "KO2",
      is_knockout: true,
      ccw_rotation: 45,
    },
    // Regular text with rotation
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_regular_3",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_4",
      anchor_position: { x: 5, y: 3 },
      anchor_alignment: "center",
      text: "REG3",
      is_knockout: false,
      ccw_rotation: 45,
    },
  ])

  expect(mixed).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-text-mixed-knockout-regular",
  )
})
