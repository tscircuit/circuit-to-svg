import { expect, test } from "bun:test"
import type { SchematicLine } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic line", () => {
  const circuitJson: SchematicLine[] = [
    {
      type: "schematic_line",
      schematic_line_id: "schematic_line_1",
      schematic_component_id: "simple_resistor_1",
      x1: 0,
      y1: 0,
      x2: 2,
      y2: 1,
      stroke_width: 0.1,
      color: "#000000",
      is_dashed: false,
      subcircuit_id: "simple_circuit",
    },
    {
      type: "schematic_line",
      schematic_line_id: "schematic_line_2",
      schematic_component_id: "simple_resistor_1",
      x1: 2,
      y1: 1,
      x2: 4,
      y2: 0,
      stroke_width: 0.05,
      color: "#ff0000",
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
