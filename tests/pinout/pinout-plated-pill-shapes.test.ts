import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPinoutSvg } from "lib"

test("pinout plated pills render horizontal, vertical and equal dimensions", () => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
  ]

  const dimensions = [
    [4, 2],
    [2, 4],
    [2, 2],
  ] as const
  for (const [index, [width, height]] of dimensions.entries()) {
    circuit.push({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: `pill_${index}`,
      pcb_component_id: "component",
      shape: "pill",
      ccw_rotation: 0,
      x: -6 + index * 6,
      y: 0,
      outer_width: width,
      outer_height: height,
      hole_width: width - 1,
      hole_height: height - 1,
      layers: ["top", "bottom"],
    })
  }

  const svg = convertCircuitJsonToPinoutSvg(circuit)
  expect(svg).not.toMatch(/v--/)
  expect(svg.match(/class="pinout-hole-outer"/g)).toHaveLength(3)
  expect(svg.match(/class="pinout-hole-inner"/g)).toHaveLength(3)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
