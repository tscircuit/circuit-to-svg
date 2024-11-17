import { expect, test } from "bun:test"
import type { SchematicText } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic text", () => {
  
  const circuitJson: SchematicText[] = [
    {
        type: "schematic_text",
        position: { x: 0, y: 1 },
        anchor: "right",
        schematic_component_id: "",
        rotation: 0,
        schematic_text_id: "",
        text: "Anas"
    },
    {
        type: "schematic_text",
        position: { x: 1, y: 1 },
        anchor: "left",
        schematic_component_id: "",
        rotation: 0,
        schematic_text_id: "",
        text: "Ahmed"
    },
    {
        type: "schematic_text",
        position: { x: 0, y: 0 },
        anchor: "center",
        schematic_component_id: "",
        rotation: 180,
        schematic_text_id: "",
        text: "Abse"
    },
  ]

  expect(
    // @ts-ignore
    convertCircuitJsonToSchematicSvg(circuitJson),
  ).toMatchSvgSnapshot(import.meta.path)
})
