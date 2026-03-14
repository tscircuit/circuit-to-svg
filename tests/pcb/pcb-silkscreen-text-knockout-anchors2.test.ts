import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - center anchor (default)", () => {
  const centerAnchor = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 15,
      height: 10,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_center_default",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "CENTER",
      is_knockout: true,
    },
  ])

  expect(centerAnchor).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-center-anchor",
  )
})
