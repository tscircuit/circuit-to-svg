import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/sch/convert-circuit-json-to-schematic-svg"
import type { AnyCircuitElement } from "circuit-json"

test("non-finite schematic component size renders well-formed SVG without NaN (#638)", () => {
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
      size: { width: Number.NaN, height: Number.NaN },
      is_box_with_pins: true,
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  expect(svg).not.toContain("NaN")
  expect(svg).toContain('class="component chip sch-component-body"')
  expect(svg).toContain('class="component-overlay sch-component-overlay"')
})
