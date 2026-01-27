import { expect, test } from "bun:test"
import type { SchematicPath } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic path", () => {
  const circuitJson: SchematicPath[] = [
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 0, y: 1 },
      ],
      is_filled: false,
      stroke_width: 0.05
    },
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [
        { x: 3, y: 0 },
        { x: 4, y: 1.5 },
        { x: 5, y: 0 },
      ],
      is_filled: true,
      fill_color: "blue",
      stroke_width: 0.05
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
