import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - multi-line with padding", () => {
  const multilineWithPadding = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 25,
      height: 15,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_multiline_padded",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "FIRST\nSECOND",
      is_knockout: true,
      knockout_padding: {
        left: 1.0,
        right: 1.0,
        top: 0.6,
        bottom: 0.6,
      },
    },
  ])

  expect(multilineWithPadding).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-multiline-padded",
  )
})
