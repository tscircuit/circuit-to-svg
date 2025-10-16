import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("corner_radius is applied to rectangular SMT pads", () => {
  const circuit: any = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rect_corner",
      shape: "rect",
      x: -2,
      y: 0,
      width: 2,
      height: 2,
      corner_radius: 0.25,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rotated_corner",
      shape: "rotated_rect",
      x: 2,
      y: 0,
      width: 2,
      height: 2,
      ccw_rotation: 30,
      corner_radius: 0.25,
      layer: "top",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "label_rect",
      layer: "top",
      font: "tscircuit2024",
      font_size: 0.5,
      anchor_position: { x: -3, y: 2.5 },
      anchor_alignment: "center",
      text: "rounded rect smtpad\ncorner_radius=0.25",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "label_rotated",
      layer: "top",
      font: "tscircuit2024",
      font_size: 0.5,
      anchor_position: { x: 3, y: 2.5 },
      anchor_alignment: "center",
      text: "rounded rotated rect smtpad\ncorner_radius=0.25",
    },
  ]

  expect(convertCircuitJsonToPcbSvg(circuit)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
