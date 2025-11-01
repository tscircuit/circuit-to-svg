import { expect, test } from "bun:test"
import type { SchematicNetLabel } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("net label any symbol orientation", () => {
  const circuitJson: SchematicNetLabel[] = [
    {
      type: "schematic_net_label",
      source_net_id: "n1",
      center: { x: 0, y: 0 },
      anchor_position: { x: 0, y: 0 },
      anchor_side: "left",
      text: "GND",
      symbol_name: "ground_down",
    },
    {
      type: "schematic_net_label",
      source_net_id: "n2",
      center: { x: 2, y: 0 },
      anchor_position: { x: 2, y: 0 },
      anchor_side: "right",
      text: "GND",
      symbol_name: "ground_down",
    },
    {
      type: "schematic_net_label",
      source_net_id: "n3",
      center: { x: 4, y: 0 },
      anchor_position: { x: 4, y: 0 },
      anchor_side: "top",
      text: "GND",
      symbol_name: "ground_down",
    },
    {
      type: "schematic_net_label",
      source_net_id: "n4",
      center: { x: 6, y: 0 },
      anchor_position: { x: 6, y: 0 },
      anchor_side: "bottom",
      text: "GND",
      symbol_name: "ground_down",
      schematic_net_label_id: "nl4",
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
        { x: 0, y: 0, label: "gnd-left" },
        { x: 2, y: 0, label: "gnd-right" },
        { x: 4, y: 0, label: "gnd-top" },
        { x: 6, y: 0, label: "gnd-bottom" },
      ],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
