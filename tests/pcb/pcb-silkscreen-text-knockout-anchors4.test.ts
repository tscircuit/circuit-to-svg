import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - bottom_right anchor", () => {
  const bottomRightAnchor = convertCircuitJsonToPcbSvg([
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
      pcb_silkscreen_text_id: "text_bottom_right",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 5, y: 2 },
      anchor_alignment: "bottom_right",
      text: "BOTRIGHT",
      is_knockout: true,
    },
  ])

  expect(bottomRightAnchor).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-bottom-right-anchor",
  )
})
