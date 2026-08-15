import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib/pcb/convert-circuit-json-to-pcb-svg"
import { convertCircuitJsonToSchematicSvg } from "lib/sch/convert-circuit-json-to-schematic-svg"
import type { AnyCircuitElement } from "circuit-json"

test("negative dimensions emit positive SVG lengths for PCB elements (#640)", () => {
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
      x: 3,
      y: 3,
      hole_diameter: -1,
      outer_diameter: -2,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "circle",
      x: -3,
      y: -3,
      hole_diameter: -2,
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout1",
      shape: "circle",
      center: { x: 0, y: 0 },
      radius: -1.5,
      layers: ["top"],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  // Verify no negative radius or width attributes exist
  expect(svg).not.toMatch(/r="-[0-9.]+/)
  expect(svg).not.toMatch(/width="-[0-9.]+/)
  expect(svg).not.toMatch(/height="-[0-9.]+/)
  expect(svg).toContain('class="pcb-hole-outer"')
  expect(svg).toContain('class="pcb-hole-inner"')
})

test("negative dimensions emit positive SVG lengths for schematic components (#640)", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "chip1",
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_chip1",
      source_component_id: "chip1",
      center: { x: 0, y: 0 },
      size: { width: -4, height: -3 },
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  expect(svg).not.toMatch(/width="-[0-9.]+/)
  expect(svg).not.toMatch(/height="-[0-9.]+/)
  expect(svg).toContain('class="component chip sch-component-body"')
})
