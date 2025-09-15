import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb pill shaped hole rotation", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      ccw_rotation: 45,
      hole_height: 2,
      hole_width: 1,
      layers: ["top", "bottom"],
      outer_height: 4,
      outer_width: 2,
      pcb_component_id: "pcb_component_0",
      pcb_group_id: undefined,
      pcb_plated_hole_id: "pcb_plated_hole_0",
      pcb_port_id: undefined,
      port_hints: ["unnamed_platedhole1"],
      shape: "pill",
      subcircuit_id: "subcircuit_source_group_0",
      type: "pcb_plated_hole",
      x: 0,
      y: 0,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
