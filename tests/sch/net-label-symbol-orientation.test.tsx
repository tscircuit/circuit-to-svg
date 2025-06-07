import { expect, test } from "bun:test"
import type { SchematicNetLabel } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

// Regression test for symbol orientation when using orientation specific
// symbol names like "ground_down" and "VCC_up"

test("net label symbol orientation", () => {
  const circuitJson: SchematicNetLabel[] = [
    {
      type: "schematic_net_label",
      source_net_id: "n1",
      center: { x: 0, y: 0 },
      anchor_position: { x: 0, y: 0 },
      anchor_side: "top",
      text: "GND",
      symbol_name: "ground_down",
      schematic_net_label_id: "nl1",
    },
    {
      type: "schematic_net_label",
      source_net_id: "n2",
      center: { x: 1, y: 0 },
      anchor_position: { x: 1, y: 0 },
      anchor_side: "bottom",
      text: "VCC",
      symbol_name: "vcc_up",
      schematic_net_label_id: "nl2",
    },
  ]

  expect(
    // @ts-ignore
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
      labeledPoints: [
        { x: 0, y: 0, label: "gnd" },
        { x: 1, y: 0, label: "vcc" },
      ],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
