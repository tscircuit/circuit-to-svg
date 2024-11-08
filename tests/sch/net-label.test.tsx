import { expect, test } from "bun:test"
import type { SchematicNetLabel } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic net label", () => {
  const circuitJson: SchematicNetLabel[] = [
    {
      type: "schematic_net_label",
      source_net_id: "net1",
      center: { x: 0, y: 0 },
      anchor_side: "top",
      text: "VCC",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net2",
      center: { x: 4, y: 0 },
      anchor_side: "bottom",
      text: "GND",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net3",
      center: { x: 0, y: 4 },
      anchor_side: "left",
      text: "SDA",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net4",
      center: { x: 4, y: 4 },
      anchor_side: "right",
      text: "SCL",
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
        { x: 0, y: 0, label: "VCC" },
        { x: 4, y: 0, label: "GND" },
        { x: 0, y: 4, label: "SDA" },
        { x: 4, y: 4, label: "SCL" },
      ],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
