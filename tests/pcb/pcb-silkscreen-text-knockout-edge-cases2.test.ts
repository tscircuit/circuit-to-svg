import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - asymmetric padding", () => {
  const asymmetricPadding = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 25,
      height: 12,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_asymmetric",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "ASYMMETRIC",
      is_knockout: true,
      knockout_padding: {
        left: 0.3,
        right: 1.5,
        top: 0.2,
        bottom: 1.0,
      },
    },
  ])

  expect(asymmetricPadding).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-asymmetric-padding",
  )
})
