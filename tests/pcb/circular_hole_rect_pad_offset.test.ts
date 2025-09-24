import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: any = [
  {
    type: "pcb_board",
    pcb_board_id: "circular_offsets_board",
    center: { x: 0, y: 0 },
    width: 28,
    height: 12,
  },
  {
    type: "pcb_plated_hole",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: -9,
    y: 0,
    hole_diameter: 1.4,
    rect_pad_width: 3.2,
    rect_pad_height: 4.4,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "circle_rect_centered",
  },
  {
    type: "pcb_plated_hole",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: -3,
    y: 0,
    hole_diameter: 1.2,
    rect_pad_width: 3,
    rect_pad_height: 4,
    hole_offset_x: 0.7,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "circle_rect_offset_x",
  },
  {
    type: "pcb_plated_hole",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: 3,
    y: 0,
    hole_diameter: 1.2,
    rect_pad_width: 3,
    rect_pad_height: 4,
    hole_offset_y: -0.8,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "circle_rect_offset_y",
  },
  {
    type: "pcb_plated_hole",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: 9,
    y: 0,
    hole_diameter: 1.4,
    rect_pad_width: 3.2,
    rect_pad_height: 4.4,
    hole_offset_x: -0.6,
    hole_offset_y: 0.6,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "circle_rect_offset_xy",
  },
]

test("circular plated holes with rectangular pad offsets", () => {
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
