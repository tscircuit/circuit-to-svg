import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

test("non-finite schematic component size does not render NaN coordinates", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "src_1",
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_1",
      source_component_id: "src_1",
      center: { x: 0, y: 0 },
      size: { width: Number.NaN, height: Number.NaN } as any,
      is_box_with_pins: true,
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)
  expect(svg).not.toContain("NaN")
  expect(svg).toContain("sch-component-body")
})
