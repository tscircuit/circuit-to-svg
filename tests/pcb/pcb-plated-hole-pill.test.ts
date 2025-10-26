import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb plated hole pill shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_3",
      pcb_component_id: "pcb_component_1",
      x: -44.08800000000002,
      y: -1.4210854715202004e-14,
      port_hints: ["2"],
      shape: "pill",
      ccw_rotation: 0,
      hole_width: 1.2,
      hole_height: 1.2,
      outer_width: 4.8,
      outer_height: 2.4,
      layers: ["top", "bottom"],
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
