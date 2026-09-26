import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

test("non-finite schematic component size does not render NaN coordinates", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_chip",
      source_component_id: "src_1",
      name: "U1",
      ftr: "soic8",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_1",
      source_component_id: "src_1",
      center: { x: 0, y: 0 },
      size: { width: Number.NaN, height: Number.NaN } as any,
      rotation: 0,
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)
  expect(svg).not.toContain("NaN")
  expect(svg).toContain("sch-component-body")
})
