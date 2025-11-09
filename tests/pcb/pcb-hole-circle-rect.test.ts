import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board_circle_rect_holes",
    center: { x: 0, y: 0 },
    width: 20,
    height: 10,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "circle_hole_1",
    hole_shape: "circle",
    x: -6,
    y: 0,
    hole_diameter: 2,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "circle_hole_2",
    hole_shape: "circle",
    x: -2,
    y: 0,
    hole_diameter: 1.5,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "rect_hole_1",
    hole_shape: "rect",
    x: 2,
    y: 0,
    hole_width: 3,
    hole_height: 2,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "rect_hole_2",
    hole_shape: "rect",
    x: 6,
    y: 0,
    hole_width: 1.5,
    hole_height: 4,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "rect_hole_3",
    hole_shape: "rect",
    x: -4,
    y: -3,
    hole_width: 4,
    hole_height: 1.5,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "circle_hole_3",
    hole_shape: "circle",
    x: 4,
    y: -3,
    hole_diameter: 1,
  },
]

test("circle and rect pcb_hole", () => {
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
