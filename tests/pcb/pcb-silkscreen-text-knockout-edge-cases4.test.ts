import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - very large font size", () => {
  const largeFont = convertCircuitJsonToPcbSvg([
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
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_large",
      font: "tscircuit2024",
      font_size: 2.5,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "BIG",
      is_knockout: true,
    },
  ])

  expect(largeFont).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-large-font",
  )
})
