import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

test("pcb plated hole with polygon pad - 90 deg ccw rotation rotates pad outline and hole offset", () => {
  // Test case from issue #709:
  // 6mm x 1mm bar with pad_outline from (-3, -0.5) to (3, 0.5) and hole_offset_x: 2
  // At ccw_rotation: 90, bar becomes vertical (y from -3 to 3, x from -0.5 to 0.5)
  // and hole_offset moves from (2, 0) to (0, 2) (above center)
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_plated_hole",
      shape: "hole_with_polygon_pad",
      pcb_plated_hole_id: "hole_rotated_90",
      hole_shape: "circle",
      hole_diameter: 0.8,
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
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)
  expect(svg).toBeDefined()

  // Match snapshot
  expect(svg).toMatchSvgSnapshot(import.meta.path, "polygon-pad-rotation-90")
})

test("pcb plated hole with polygon pad - multiple rotation angles and inner drill shapes", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 50,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // Unrotated control (0 deg)
    {
      type: "pcb_plated_hole",
      shape: "hole_with_polygon_pad",
      pcb_plated_hole_id: "hole_0",
      hole_shape: "circle",
      hole_diameter: 1,
      x: -15,
      y: 15,
      hole_offset_x: 2,
      hole_offset_y: 0,
      ccw_rotation: 0,
      pad_outline: [
        { x: -3, y: -1 },
        { x: 3, y: -1 },
        { x: 3, y: 1 },
        { x: -3, y: 1 },
      ],
      layers: ["top", "bottom"],
    },
    // 45 deg rotation with oval hole
    {
      type: "pcb_plated_hole",
      shape: "hole_with_polygon_pad",
      pcb_plated_hole_id: "hole_45",
      hole_shape: "oval",
      hole_width: 1,
      hole_height: 2,
      x: 15,
      y: 15,
      hole_offset_x: 1,
      hole_offset_y: 0,
      ccw_rotation: 45,
      pad_outline: [
        { x: -3, y: -1.5 },
        { x: 3, y: -1.5 },
        { x: 3, y: 1.5 },
        { x: -3, y: 1.5 },
      ],
      layers: ["top", "bottom"],
    },
    // 180 deg rotation with pill hole
    {
      type: "pcb_plated_hole",
      shape: "hole_with_polygon_pad",
      pcb_plated_hole_id: "hole_180",
      hole_shape: "pill",
      hole_width: 2,
      hole_height: 1,
      x: -15,
      y: -15,
      hole_offset_x: 2,
      hole_offset_y: 0,
      ccw_rotation: 180,
      pad_outline: [
        { x: -3, y: -1 },
        { x: 3, y: -1 },
        { x: 3, y: 1 },
        { x: -3, y: 1 },
      ],
      layers: ["top", "bottom"],
    },
    // 270 deg rotation with pin number
    {
      type: "pcb_plated_hole",
      shape: "hole_with_polygon_pad",
      pcb_plated_hole_id: "hole_270",
      hole_shape: "circle",
      hole_diameter: 1,
      x: 15,
      y: -15,
      hole_offset_x: 2,
      hole_offset_y: 0,
      ccw_rotation: 270,
      pad_outline: [
        { x: -3, y: -1 },
        { x: 3, y: -1 },
        { x: 3, y: 1 },
        { x: -3, y: 1 },
      ],
      layers: ["top", "bottom"],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)
  expect(svg).toBeDefined()
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "polygon-pad-rotation-all-angles",
  )
})

test("getComprehensivePcbBounds accounts for rotated hole_with_polygon_pad", () => {
  // A 6mm x 1mm horizontal bar rotated 90 deg becomes a 1mm x 6mm vertical bar
  const unrotated = [
    {
      type: "pcb_plated_hole",
      shape: "hole_with_polygon_pad",
      pcb_plated_hole_id: "hole_unrot",
      hole_shape: "circle",
      hole_diameter: 0.8,
      x: 0,
      y: 0,
      hole_offset_x: 0,
      hole_offset_y: 0,
      ccw_rotation: 0,
      pad_outline: [
        { x: -3, y: -0.5 },
        { x: 3, y: -0.5 },
        { x: 3, y: 0.5 },
        { x: -3, y: 0.5 },
      ],
      layers: ["top", "bottom"],
    },
  ]

  const rotated = [
    {
      type: "pcb_plated_hole",
      shape: "hole_with_polygon_pad",
      pcb_plated_hole_id: "hole_rot",
      hole_shape: "circle",
      hole_diameter: 0.8,
      x: 0,
      y: 0,
      hole_offset_x: 0,
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
  ]

  const boundsUnrotated = getComprehensivePcbBounds(unrotated as any)
  const boundsRotated = getComprehensivePcbBounds(rotated as any)

  // Unrotated: X spans [-3, 3], Y spans [-0.5, 0.5]
  expect(boundsUnrotated.minX).toBeCloseTo(-3, 1)
  expect(boundsUnrotated.maxX).toBeCloseTo(3, 1)
  expect(boundsUnrotated.minY).toBeCloseTo(-0.5, 1)
  expect(boundsUnrotated.maxY).toBeCloseTo(0.5, 1)

  // Rotated 90 deg: X spans [-0.5, 0.5], Y spans [-3, 3]
  expect(boundsRotated.minX).toBeCloseTo(-0.5, 1)
  expect(boundsRotated.maxX).toBeCloseTo(0.5, 1)
  expect(boundsRotated.minY).toBeCloseTo(-3, 1)
  expect(boundsRotated.maxY).toBeCloseTo(3, 1)
})
