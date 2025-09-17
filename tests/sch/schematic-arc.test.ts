import { expect, test } from "bun:test"
import type { SchematicArc } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic arc", () => {
  const circuitJson: SchematicArc[] = [
    {
      type: "schematic_arc",
      schematic_arc_id: "schematic_arc_1",
      schematic_component_id: "simple_resistor_1",
      center: { x: 1, y: 1 },
      radius: 0.5,
      start_angle_degrees: 0,
      end_angle_degrees: 90,
      direction: "counterclockwise",
      stroke_width: 0.1,
      color: "#000000",
      is_dashed: false,
      subcircuit_id: "simple_circuit",
    },
    {
      type: "schematic_arc",
      schematic_arc_id: "schematic_arc_2",
      schematic_component_id: "simple_resistor_1",
      center: { x: 3, y: 1 },
      radius: 0.4,
      start_angle_degrees: 45,
      end_angle_degrees: 270,
      direction: "clockwise",
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
