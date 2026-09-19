import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

test("hole_with_polygon_pad honors ccw_rotation on pad outline and hole offset", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 50,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_rot_90",
      shape: "hole_with_polygon_pad",
      x: 0,
      y: 0,
      ccw_rotation: 90,
      hole_shape: "circle",
      hole_diameter: 1,
      hole_offset_x: 2,
      hole_offset_y: 0,
      pad_outline: [
        { x: -3, y: -0.5 },
        { x: 3, y: -0.5 },
        { x: 3, y: 0.5 },
        { x: -3, y: 0.5 },
      ],
      layers: ["top", "bottom"],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)
  expect(svg).toContain('<polygon')
  expect(svg).toContain('<circle')

  // When rotated 90 deg CCW, hole_offset_x: 2 (which was at +X) rotates to +Y (above the center).
  // In screen space (where Y is flipped down), the drill should be offset vertically, not horizontally.
  expect(svg).toMatchSnapshot()
})
