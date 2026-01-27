import { expect, test } from "bun:test"
import type { SchematicPath } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic path with svg_path and stroke_color", () => {
  const circuitJson: SchematicPath[] = [
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [],
      svg_path: "M 0 0 L 1 0 L 1 1 L 0 1 Z",
      is_filled: false,
      stroke_width: 0.05,
    },
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [],
      svg_path: "M 2 0 Q 2.5 1 3 0",
      is_filled: false,
      stroke_width: 0.03,
      stroke_color: "#00ff00",
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
