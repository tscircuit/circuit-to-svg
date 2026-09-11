import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToAssemblySvg } from "lib"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_npth_shapes",
    center: { x: 0, y: 0 },
    width: 20,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "rect_npth",
    hole_shape: "rect",
    x: -6,
    y: 0,
    hole_width: 3,
    hole_height: 1.5,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pill_npth",
    hole_shape: "pill",
    x: 0,
    y: 0,
    hole_width: 1.2,
    hole_height: 4,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "rotated_pill_npth",
    hole_shape: "rotated_pill",
    x: 6,
    y: 0,
    hole_width: 3.5,
    hole_height: 1.5,
    ccw_rotation: 30,
  },
]

test("assembly draws rect, pill, and rotated_pill NPTH instead of dropping them", () => {
  const svg = convertCircuitJsonToAssemblySvg(circuitJson)
  expect(svg.match(/class="assembly-hole"/g)?.length).toBe(3)
  expect(svg).toContain("<rect")
  expect(svg).toContain("<path")
  expect(svg).toContain("rotate(-30)")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
