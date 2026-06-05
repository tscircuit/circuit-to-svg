import { expect, test } from "bun:test"
import type { SchematicLine, SchematicPath } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic dash patterns", () => {
  const circuitJson: Array<SchematicLine | SchematicPath> = [
    {
      type: "schematic_line",
      schematic_line_id: "schematic_line_dash_long",
      x1: 0,
      y1: 0,
      x2: 2,
      y2: 0,
      stroke_width: 0.08,
      color: "#c0392b",
      is_dashed: true,
      dash_length: 0.35,
      dash_gap: 0.08,
      subcircuit_id: "simple_circuit",
    },
    {
      type: "schematic_line",
      schematic_line_id: "schematic_line_gap_long",
      x1: 0,
      y1: 1,
      x2: 2,
      y2: 1,
      stroke_width: 0.08,
      color: "#2980b9",
      is_dashed: true,
      dash_length: 0.08,
      dash_gap: 0.28,
      subcircuit_id: "simple_circuit",
    },
    {
      type: "schematic_path",
      schematic_path_id: "schematic_path_balanced_dash",
      points: [
        { x: 3, y: 0 },
        { x: 4.5, y: 0 },
        { x: 4.5, y: 1 },
        { x: 3, y: 1 },
      ],
      is_filled: false,
      is_dashed: true,
      dash_length: 0.18,
      dash_gap: 0.12,
      stroke_width: 0.06,
    },
    {
      type: "schematic_path",
      schematic_path_id: "schematic_path_dense_dash",
      points: [
        { x: 5.5, y: 0 },
        { x: 6.5, y: 1.2 },
        { x: 7.5, y: 0 },
      ],
      is_filled: false,
      is_dashed: true,
      dash_length: 0.1,
      dash_gap: 0.04,
      stroke_width: 0.06,
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
