import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board_pill_holes",
    center: { x: 0, y: 0 },
    width: 20,
    height: 10,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pill_hole_1",
    hole_shape: "pill",
    x: -6,
    y: 0,
    hole_width: 1.5,
    hole_height: 3.5,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pill_hole_2",
    hole_shape: "pill",
    x: -2,
    y: 0,
    hole_width: 1.0,
    hole_height: 4.0,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "rotated_pill_hole_1",
    hole_shape: "rotated_pill",
    x: 2,
    y: 0,
    hole_width: 1.2,
    hole_height: 3.0,
    ccw_rotation: 45,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "rotated_pill_hole_2",
    hole_shape: "rotated_pill",
    x: 6,
    y: 0,
    hole_width: 1.8,
    hole_height: 3.8,
    ccw_rotation: -30,
  },
]

test("pill-shaped pcb_hole", () => {
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
