import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb plated hole pill and oval shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_1",
      pcb_component_id: "pcb_component_1",
      x: 0,
      y: -2,
      port_hints: ["1"],
      shape: "pill",
      ccw_rotation: 0,
      hole_width: 3.2,
      hole_height: 1.2,
      outer_width: 4.8,
      outer_height: 2.4,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_2",
      pcb_component_id: "pcb_component_1",
      x: 0,
      y: 2,
      port_hints: ["2"],
      shape: "oval",
      ccw_rotation: 0,
      hole_width: 3.2,
      hole_height: 1.2,
      outer_width: 4.8,
      outer_height: 2.4,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_board",
      center: {
        x: 0,
        y: 0,
      },
      width: 10,
      height: 10,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
      pcb_board_id: "board_0",
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
