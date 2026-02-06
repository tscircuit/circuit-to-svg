import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen text knockout with padding", () => {
  const knockoutWithPadding = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 20,
      height: 10,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "PADDED",
      is_knockout: true,
      knockout_padding: {
        left: 0.8,
        right: 0.8,
        top: 0.5,
        bottom: 0.5,
      },
    },
  ])

  expect(knockoutWithPadding).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-padding",
  )
})
