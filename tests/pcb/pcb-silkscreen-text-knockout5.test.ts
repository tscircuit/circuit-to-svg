import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen text knockout comparison with regular text", () => {
  const comparison = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 30,
      height: 15,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    // Regular text
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_regular",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -8, y: 0 },
      anchor_alignment: "center",
      text: "REGULAR",
      is_knockout: false,
    },
    // Knockout text
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_knockout",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 8, y: 0 },
      anchor_alignment: "center",
      text: "KNOCKOUT",
      is_knockout: true,
    },
  ])

  expect(comparison).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-comparison",
  )
})
