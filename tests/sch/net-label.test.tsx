import { expect, test } from "bun:test"
import type { SchematicNetLabel } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic net label", () => {
  // NOTE: center isn't computed properly where anchor_position is defined but
  // this doesn't affect the implementation, which prefers to use anchor_position.
  // There are some net labels missing anchor_position intentionally to test
  // computing the anchor position
  const circuitJson: SchematicNetLabel[] = [
    {
      type: "schematic_net_label",
      source_net_id: "net1",
      center: { x: 0, y: 3 },
      anchor_position: { x: 0, y: 3 },
      anchor_side: "top",
      text: "VCC",
      schematic_net_label_id: "schematic_net_label_0",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net2",
      center: { x: 1, y: 3 },
      anchor_position: { x: 1, y: 3 },
      anchor_side: "bottom",
      text: "GND",
      schematic_net_label_id: "schematic_net_label_1",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net3",
      center: { x: 0, y: 4 },
      anchor_position: { x: 0, y: 4 },
      anchor_side: "left",
      text: "SDA",
      schematic_net_label_id: "schematic_net_label_2",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net4",
      center: { x: 2, y: 4 },
      anchor_position: { x: 2, y: 4 },
      anchor_side: "right",
      text: "SCL",
      schematic_net_label_id: "schematic_net_label_3",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net5",
      center: { x: 0, y: 1 },
      anchor_position: { x: 0, y: 1 },
      anchor_side: "left",
      text: "short label",
      schematic_net_label_id: "schematic_net_label_4",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net6",
      center: { x: 0, y: 0 },
      anchor_position: { x: 0, y: 0 },
      anchor_side: "left",
      text: "WWWWWWWWWW", // W is a wide character
      schematic_net_label_id: "schematic_net_label_5",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net5",
      center: { x: 2.5, y: 0 },
      anchor_position: { x: 2.5, y: 0 },
      anchor_side: "bottom",
      text: "superlong label. This is a long one!",
      schematic_net_label_id: "schematic_net_label_6",
    },
    // MISSING ANCHOR POSITION
    {
      type: "schematic_net_label",
      source_net_id: "net5",
      center: { x: 4, y: 1 },
      anchor_side: "left",
      text: "CENTER1",
      schematic_net_label_id: "schematic_net_label_7",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net5",
      center: { x: 4, y: 3 },
      anchor_side: "left",
      text: "CENTER1/CENTER4/CENTER4",
      schematic_net_label_id: "schematic_net_label_7",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net5",
      center: { x: 4, y: 2 },
      anchor_side: "right",
      text: "CENTER2",
      schematic_net_label_id: "schematic_net_label_8",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net5",
      center: { x: 4, y: 3 },
      anchor_side: "top",
      text: "CENTER3",
      schematic_net_label_id: "schematic_net_label_9",
    },
    {
      type: "schematic_net_label",
      source_net_id: "net5",
      center: { x: 4, y: 4 },
      anchor_side: "bottom",
      text: "CENTER4",
      schematic_net_label_id: "schematic_net_label_10",
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
        { x: 0, y: 3, label: "anchor_side=top" },
        { x: 1, y: 3, label: "anchor_side=bottom" },
        { x: 0, y: 4, label: "anchor_side=left" },
        { x: 2, y: 4, label: "anchor_side=right" },
        { x: 4, y: 1, label: "center1" },
        { x: 4, y: 2, label: "center2" },
        { x: 4, y: 3, label: "center3" },
        { x: 4, y: 4, label: "center4" },
      ],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})

test("schematic resistor", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <resistor
        name="R1"
        resistance="10"
        footprint="0402"
        pcbX={-2}
        schX={-1}
        symbolName="boxresistor_right"
      />
      <capacitor
        name="C1"
        capacitance="0.1"
        footprint="0402"
        pcbX={2}
        schX={2}
      />
      <trace from="net.DTR" to=".C1 > .pin1" />
      <trace from="net.label1label2label1label2label1label2" to=".R1 > .pin2" />
      <trace from="net.label1label2" to=".R1 > .pin1" />
    </board>,
  )

  await circuit.renderUntilSettled()

  expect(
    convertCircuitJsonToSchematicSvg(circuit.getCircuitJson()),
  ).toMatchSvgSnapshot(import.meta.path + "net-label.test.tsx")
})
