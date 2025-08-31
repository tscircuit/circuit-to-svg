import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board_0",
    center: { x: 0, y: 0 },
    width: 8,
    height: 8,
  },
  {
    type: "pcb_plated_hole" as const,
    shape: "rotated_pill_hole_with_rect_pad" as const,
    hole_shape: "rotated_pill" as const,
    pad_shape: "rect" as const,
    x: 0,
    y: 0,
    layers: ["top", "bottom"] as const,
    hole_width: 1.5,
    hole_height: 3,
    hole_ccw_rotation: 45,
    rect_pad_width: 2,
    rect_pad_height: 4,
    rect_ccw_rotation: 30,
    pcb_plated_hole_id: "hole_1",
  },
]

test("rotated pill hole with rect pad", () => {
  expect(convertCircuitJsonToPcbSvg(circuit)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
