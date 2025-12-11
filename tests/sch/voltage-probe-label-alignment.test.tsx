import { convertCircuitJsonToSchematicSvg } from "lib/sch/convert-circuit-json-to-schematic-svg"
import { test, expect } from "bun:test"
import type { SchematicVoltageProbe } from "circuit-json"

test("should render voltage probe with different label alignments", async () => {
  const circuitJson: SchematicVoltageProbe[] = [
    {
      type: "schematic_voltage_probe",
      position: { x: -2, y: 2 },
      schematic_voltage_probe_id: "1",
      schematic_trace_id: "1",
      name: "V1",
      voltage: 5,
      label_alignment: "center_left",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 0, y: 2 },
      schematic_voltage_probe_id: "2",
      schematic_trace_id: "2",
      name: "V2",
      voltage: 3.3,
      label_alignment: "center_right",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 2, y: 2 },
      schematic_voltage_probe_id: "3",
      schematic_trace_id: "3",
      name: "V3",
      voltage: 12,
      label_alignment: "top_left",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: -2, y: 0 },
      schematic_voltage_probe_id: "4",
      schematic_trace_id: "4",
      name: "V4",
      voltage: 1.8,
      label_alignment: "top_right",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 0, y: 0 },
      schematic_voltage_probe_id: "5",
      schematic_trace_id: "5",
      name: "V5",
      voltage: -5,
      label_alignment: "bottom_left",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 2, y: 0 },
      schematic_voltage_probe_id: "6",
      schematic_trace_id: "6",
      name: "GND",
      voltage: 0,
      label_alignment: "bottom_right",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: -2, y: -2 },
      schematic_voltage_probe_id: "7",
      schematic_trace_id: "7",
      name: "V7",
      voltage: 2.5,
      // No label_alignment specified - should default to center_right
    },
  ]

  expect(
    // @ts-ignore
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
