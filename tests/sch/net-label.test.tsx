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
    {
      type: "schematic_net_label",
      source_net_id: "net5",
      center: { x: 0, y: 2 },
      anchor_side: "left",
      text: "short label",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net6",
      center: { x: 0, y: 1 },
      anchor_side: "left",
      text: "WWWWWWWWWW",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net5",
      center: { x: 2, y: 0 },
      anchor_side: "bottom",
      text: "superlong label. This is a long one!",
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
        { x: 0, y: 0, label: "anchor_side=top" },
        { x: 4, y: 0, label: "anchor_side=bottom" },
        { x: 0, y: 4, label: "anchor_side=left" },
        { x: 4, y: 4, label: "anchor_side=right" },
      ],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
