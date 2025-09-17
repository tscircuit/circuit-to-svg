import { expect, test } from "bun:test"
import type { SchematicCircle } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic circle", () => {
  const circuitJson: SchematicCircle[] = [
    {
      type: "schematic_circle",
      schematic_circle_id: "schematic_circle_1",
      schematic_component_id: "simple_resistor_1",
      center: { x: 1, y: 1 },
      radius: 0.5,
      stroke_width: 0.1,
      color: "#000000",
      is_filled: false,
      is_dashed: false,
      subcircuit_id: "simple_circuit",
    },
    {
      type: "schematic_circle",
      schematic_circle_id: "schematic_circle_2",
      schematic_component_id: "simple_resistor_1",
      center: { x: 3, y: 1 },
      radius: 0.3,
      stroke_width: 0.05,
      color: "#ff0000",
      is_filled: true,
      fill_color: "#ffcccc",
      is_dashed: true,
      subcircuit_id: "simple_circuit",
    },
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
