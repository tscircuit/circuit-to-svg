import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - rotation + anchor + padding combined", () => {
  const combined = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 30,
      height: 30,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    // 0° rotation, top_left anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_0deg",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_0",
      anchor_position: { x: -10, y: -10 },
      anchor_alignment: "top_left",
      text: "0DEG",
      is_knockout: true,
      ccw_rotation: 0,
      knockout_padding: {
        left: 0.5,
        right: 0.5,
        top: 0.3,
        bottom: 0.3,
      },
    },
    // 45° rotation, center anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_45deg",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_1",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "45DEG",
      is_knockout: true,
      ccw_rotation: 45,
      knockout_padding: {
        left: 0.6,
        right: 0.6,
        top: 0.4,
        bottom: 0.4,
      },
    },
    // 90° rotation, bottom_right anchor
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_90deg",
      font: "tscircuit2024",
      font_size: 0.6,
      pcb_component_id: "comp_2",
      anchor_position: { x: 10, y: 10 },
      anchor_alignment: "bottom_right",
      text: "90DEG",
      is_knockout: true,
      ccw_rotation: 90,
      knockout_padding: {
        left: 0.5,
        right: 0.5,
        top: 0.3,
        bottom: 0.3,
      },
    },
  ])

  expect(combined).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-combined-features",
  )
})
