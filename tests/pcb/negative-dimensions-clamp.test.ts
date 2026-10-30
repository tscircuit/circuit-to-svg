import { expect, test } from "bun:test"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "lib"

test("negative via, plated hole, hole, and keepout clamp to zero instead of negative SVG attributes", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 40,
      height: 40,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_0",
      x: 0,
      y: 0,
      hole_diameter: -1,
      outer_diameter: -2,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "plated_hole_0",
      shape: "circle",
      x: 5,
      y: 5,
      hole_diameter: -1,
      outer_diameter: -2,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_0",
      hole_shape: "circle",
      x: 10,
      y: 10,
      hole_diameter: -2,
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout_circle_0",
      shape: "circle",
      center: { x: -5, y: -5 },
      radius: -1,
      layers: ["top"],
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout_rect_0",
      shape: "rect",
      center: { x: -10, y: -10 },
      width: -10,
      height: -5,
      layers: ["top"],
    },
  ])

  expect(result).not.toContain('r="-')
  expect(result).not.toContain('width="-')
  expect(result).not.toContain('height="-')
  expect(result).toContain('r="0"')
})

test("negative schematic component size emits non-negative width and height", () => {
  const result = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_component",
      schematic_component_id: "sch_comp_0",
      center: { x: 0, y: 0 },
      size: { width: -4, height: -2 },
      source_component_id: "source_comp_0",
      is_box_with_pins: true,
    },
  ])

  expect(result).not.toContain('width="-')
  expect(result).not.toContain('height="-')
  expect(result).toContain('class="component chip sch-component-body"')
})
