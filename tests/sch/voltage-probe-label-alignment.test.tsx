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
      name: "TOP_LEFT",
      label_alignment: "top_left",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 0, y: 1.8 },
      schematic_voltage_probe_id: "2",
      schematic_trace_id: "2",
      name: "TOP_CENTER",
      label_alignment: "top_center",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 2, y: 2 },
      schematic_voltage_probe_id: "2",
      schematic_trace_id: "2",
      name: "TOP_RIGHT",
      label_alignment: "top_right",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: -2, y: 0 },
      schematic_voltage_probe_id: "4",
      schematic_trace_id: "4",
      name: "CENTER_LEFT",
      label_alignment: "center_left",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 0, y: 0 },
      schematic_voltage_probe_id: "5",
      schematic_trace_id: "5",
      name: "CENTER",
      label_alignment: "center",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 2, y: 0 },
      schematic_voltage_probe_id: "6",
      schematic_trace_id: "6",
      name: "CENTER_RIGHT",
      label_alignment: "center_right",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: -2, y: -2 },
      schematic_voltage_probe_id: "7",
      schematic_trace_id: "7",
      name: "BOTTOM_LEFT",
      label_alignment: "bottom_left",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 0, y: -1.8 },
      schematic_voltage_probe_id: "8",
      schematic_trace_id: "8",
      name: "BOTTOM_CENTER",
      label_alignment: "bottom_center",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 2, y: -2 },
      schematic_voltage_probe_id: "9",
      schematic_trace_id: "9",
      name: "BOTTOM_RIGHT",
      label_alignment: "bottom_right",
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
