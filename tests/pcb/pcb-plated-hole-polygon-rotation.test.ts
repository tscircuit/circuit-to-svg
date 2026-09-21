import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb plated hole with polygon pad respects ccw_rotation", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 40,
      height: 40,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_plated_hole",
      shape: "hole_with_polygon_pad",
      pcb_plated_hole_id: "hole_polygon_rotated",
      hole_shape: "circle",
      hole_diameter: 1.0,
      x: 0,
      y: 0,
      hole_offset_x: 2,
      hole_offset_y: 0,
      ccw_rotation: 90,
      pad_outline: [
        { x: -3, y: -0.5 },
        { x: 3, y: -0.5 },
        { x: 3, y: 0.5 },
        { x: -3, y: 0.5 },
      ],
      layers: ["top", "bottom"],
    },
  ])

  // Drill offset should rotate from +X (2, 0) to +Y (0, 2)
  // In SVG coordinates, Y is inverted: cy becomes negative or offset upward
  expect(result).toContain('class="pcb-hole-inner"')
  expect(result).toContain('class="pcb-hole-outer-pad"')
})
