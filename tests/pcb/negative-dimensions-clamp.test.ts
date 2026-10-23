import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg, convertCircuitJsonToSchematicSvg } from "../../lib"
import type { AnyCircuitElement } from "circuit-json"

test("negative dimensions clamp to 0 instead of emitting negative SVG lengths", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
    },
    {
      type: "pcb_via",
      pcb_via_id: "via1",
      x: 0,
      y: 0,
      hole_diameter: -1,
      outer_diameter: -2,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "circle",
      hole_diameter: -2,
      x: 5,
      y: 5,
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "plated_hole1",
      shape: "circle",
      hole_diameter: -1,
      outer_diameter: -2,
      x: -5,
      y: -5,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout1",
      shape: "circle",
      radius: -1,
      center: { x: 2, y: 2 },
      layers: ["top"],
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout2",
      shape: "rect",
      width: -4,
      height: -2,
      center: { x: -2, y: -2 },
      layers: ["top"],
    },
  ]

  const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)

  // Verify no negative length attributes in SVG
  expect(pcbSvg).not.toMatch(/r="-\d/)
  expect(pcbSvg).not.toMatch(/width="-\d/)
  expect(pcbSvg).not.toMatch(/height="-\d/)
})

test("negative schematic component dimensions clamp to 0 without emitting negative width/height", () => {
  const schJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "source1",
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch1",
      source_component_id: "source1",
      center: { x: 0, y: 0 },
      size: { width: -4, height: -2 },
    },
  ]

  const schSvg = convertCircuitJsonToSchematicSvg(schJson)

  // Verify no negative width or height
  expect(schSvg).not.toMatch(/width="-\d/)
  expect(schSvg).not.toMatch(/height="-\d/)
})
