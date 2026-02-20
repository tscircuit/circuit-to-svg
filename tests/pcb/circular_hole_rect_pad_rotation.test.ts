import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "circular_rect_rotation_board",
    center: { x: 0, y: 0 },
    width: 28,
    height: 12,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_plated_hole",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: -6,
    y: 0,
    hole_offset_x: 0,
    hole_offset_y: 0,
    hole_diameter: 1.4,
    rect_pad_width: 3.2,
    rect_pad_height: 4.4,
    rect_ccw_rotation: 45,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "circle_rect_rotated_45",
  },
  {
    type: "pcb_plated_hole",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: 0,
    y: 0,
    hole_offset_x: 0,
    hole_offset_y: 0,
    hole_diameter: 1.2,
    rect_pad_width: 3,
    rect_pad_height: 5,
    rect_ccw_rotation: 90,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "circle_rect_rotated_90",
  },
  {
    type: "pcb_plated_hole",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: 6,
    y: 0,
    hole_offset_x: 0,
    hole_offset_y: 0,
    hole_diameter: 1.4,
    rect_pad_width: 3.2,
    rect_pad_height: 4.4,
    rect_ccw_rotation: -30,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "circle_rect_rotated_neg30",
  },
]

test("circular plated holes with rectangular pad rotation", () => {
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
