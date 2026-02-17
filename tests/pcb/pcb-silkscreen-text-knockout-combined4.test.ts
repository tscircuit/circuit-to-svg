import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - bottom layer with rotation", () => {
  const bottomRotated = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 20,
      height: 12,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "text_bottom_rot",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "BOTTOM-ROT",
      is_knockout: true,
      ccw_rotation: 45,
      knockout_padding: {
        left: 0.7,
        right: 0.7,
        top: 0.4,
        bottom: 0.4,
      },
    },
  ])

  expect(bottomRotated).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-bottom-rotated",
  )
})
