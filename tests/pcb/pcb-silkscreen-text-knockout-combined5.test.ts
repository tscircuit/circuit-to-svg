import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - multiple knockout texts on same board", () => {
  const multiple = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 40,
      height: 15,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_1",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_0",
      anchor_position: { x: -12, y: 0 },
      anchor_alignment: "center",
      text: "ONE",
      is_knockout: true,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_2",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_1",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "TWO",
      is_knockout: true,
      ccw_rotation: 90,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_3",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "comp_2",
      anchor_position: { x: 12, y: 0 },
      anchor_alignment: "center",
      text: "THREE",
      is_knockout: true,
      knockout_padding: {
        left: 1.0,
        right: 1.0,
        top: 0.5,
        bottom: 0.5,
      },
    },
  ])

  expect(multiple).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-multiple-texts",
  )
})
