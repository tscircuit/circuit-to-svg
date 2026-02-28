import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - multi-line with rotation", () => {
  const multilineRotated = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 25,
      height: 25,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_multiline_rotated",
      font: "tscircuit2024",
      font_size: 0.7,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "ROT\nATE\nD",
      is_knockout: true,
      ccw_rotation: 90,
    },
  ])

  expect(multilineRotated).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-multiline-rotated",
  )
})
