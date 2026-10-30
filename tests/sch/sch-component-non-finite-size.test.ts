import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("convertCircuitJsonToSchematicSvg sanitizes non-finite schematic_component size", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_1",
      source_component_id: "source_component_1",
      center: { x: 0, y: 0 },
      size: { width: Number.NaN, height: Number.POSITIVE_INFINITY },
      is_box_with_pins: true,
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  expect(svg).not.toContain("NaN")
  expect(svg).not.toContain("Infinity")
  expect(svg).toContain('width="0"')
  expect(svg).toContain('height="0"')
})
