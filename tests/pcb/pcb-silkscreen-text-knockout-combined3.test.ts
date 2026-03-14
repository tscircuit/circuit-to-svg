import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - 270° rotation", () => {
  const rotated270 = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_270",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "270DEG",
      is_knockout: true,
      ccw_rotation: 270,
    },
  ])

  expect(rotated270).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-270-rotation",
  )
})
