import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("component-owned primitives render inside schematic component group", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_1",
      source_component_id: "source_component_1",
      center: { x: 0, y: 0 },
      size: { width: 2, height: 2 },
      is_box_with_pins: true,
    },
    {
      type: "schematic_path",
      schematic_path_id: "schematic_path_1",
      schematic_component_id: "schematic_component_1",
      points: [
        { x: -0.4, y: 0 },
        { x: 0.4, y: 0 },
      ],
      stroke_width: 0.05,
      is_filled: false,
    },
    {
      type: "schematic_circle",
      schematic_circle_id: "schematic_circle_1",
      schematic_component_id: "schematic_component_1",
      center: { x: 0, y: 0.4 },
      radius: 0.1,
      is_filled: false,
      is_dashed: false,
      color: "#000000",
      stroke_width: 0.03,
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
