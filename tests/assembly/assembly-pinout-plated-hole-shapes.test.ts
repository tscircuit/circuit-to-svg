import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPinoutSvg,
} from "lib/index"

test("renders horizontal/rotated pill, oval, and hole_with_polygon_pad plated holes in assembly and pinout SVG", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_horizontal_pill",
      shape: "pill",
      x: -8,
      y: 4,
      outer_width: 4,
      outer_height: 2,
      hole_width: 2.5,
      hole_height: 1,
      ccw_rotation: 30,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_oval",
      shape: "oval",
      x: -2,
      y: 4,
      outer_width: 3,
      outer_height: 2,
      hole_width: 1.8,
      hole_height: 1,
      ccw_rotation: 45,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_polygon_pad",
      shape: "hole_with_polygon_pad",
      hole_shape: "circle",
      x: 4,
      y: 4,
      hole_diameter: 1,
      hole_offset_x: 0.2,
      hole_offset_y: -0.1,
      pad_outline: [
        { x: -1.5, y: -1 },
        { x: 1.5, y: -1 },
        { x: 1.5, y: 1 },
        { x: -1.5, y: 1 },
      ],
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_rect_pad_offset",
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      x: 8,
      y: -4,
      hole_diameter: 1,
      rect_pad_width: 2.4,
      rect_pad_height: 1.8,
      rect_border_radius: 0.3,
      rect_ccw_rotation: 20,
      hole_offset_x: 0.3,
      hole_offset_y: 0.2,
      layers: ["top", "bottom"],
    },
  ]

  const assemblySvg = convertCircuitJsonToAssemblySvg(circuitJson)
  expect(assemblySvg).toContain('class="assembly-hole-outer"')
  expect(assemblySvg).toContain("rotate(-30)")
  expect(assemblySvg).toContain("<ellipse")
  expect(assemblySvg).toContain("rotate(-45)")
  expect(assemblySvg).toContain('<polygon class="assembly-hole-outer-pad"')

  const pinoutSvg = convertCircuitJsonToPinoutSvg(circuitJson)
  expect(pinoutSvg).toContain('class="pinout-hole-outer"')
  expect(pinoutSvg).toContain("rotate(-30)")
  expect(pinoutSvg).toContain("<ellipse")
  expect(pinoutSvg).toContain("rotate(-45)")
  expect(pinoutSvg).toContain('<polygon class="pinout-hole-outer-pad"')
  expect(pinoutSvg).toContain("rotate(-20)")
})
