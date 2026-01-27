import { expect, test } from "bun:test"
import type { SchematicPath } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic path with H, V, A and relative commands", () => {
  const circuitJson: SchematicPath[] = [
    // Path using H (horizontal) and V (vertical) commands
    // Creates a staircase pattern
    {
      type: "schematic_path",
      schematic_component_id: "test_1",
      points: [],
      svg_path: "M 0 0 H 2 V 1 H 4 V 2 H 6",
      is_filled: false,
      stroke_width: 0.05,
    },
    // Path using A (arc) command - semicircle
    {
      type: "schematic_path",
      schematic_component_id: "test_2",
      points: [],
      svg_path: "M 0 5 A 1.5 1.5 0 0 1 3 5",
      is_filled: false,
      stroke_width: 0.05,
      stroke_color: "#ff0000",
    },
    // Path using relative h and v commands
    {
      type: "schematic_path",
      schematic_component_id: "test_3",
      points: [],
      svg_path: "M 0 8 h 2 v 1 h -1 v 1 h 2",
      is_filled: false,
      stroke_width: 0.05,
      stroke_color: "#00ff00",
    },
    // Path combining arc and line
    {
      type: "schematic_path",
      schematic_component_id: "test_4",
      points: [],
      svg_path: "M 5 5 L 6 5 A 0.5 0.5 0 0 1 7 5 L 8 5",
      is_filled: false,
      stroke_width: 0.05,
      stroke_color: "#0000ff",
    },
    // Path with relative arc command
    {
      type: "schematic_path",
      schematic_component_id: "test_5",
      points: [],
      svg_path: "M 5 8 a 1 1 0 0 1 2 0 a 1 1 0 0 1 2 0",
      is_filled: false,
      stroke_width: 0.05,
      stroke_color: "#ff00ff",
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
