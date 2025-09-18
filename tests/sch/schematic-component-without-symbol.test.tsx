import { expect, test } from "bun:test"
import type { SchematicComponent } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic component without symbol when the is_box_with_pins is false", () => {
  const circuitJson: SchematicComponent[] = [
    {
      center: {
        x: 0,
        y: 0,
      },
      schematic_component_id: "schematic_component_0",
      schematic_group_id: "schematic_group_0",
      size: {
        height: 10,
        width: 10,
      },
      source_component_id: "source_component_0",
      symbol_display_value: undefined,
      type: "schematic_component",
      is_box_with_pins: false,
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
