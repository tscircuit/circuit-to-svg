import { convertCircuitJsonToSchematicSvg } from "lib/sch/convert-circuit-json-to-schematic-svg"
import { test, expect } from "bun:test"
import type { SchematicVoltageProbe } from "circuit-json"

test("should render voltage probe with custom colors", async () => {
  const circuitJson: SchematicVoltageProbe[] = [
    {
      type: "schematic_voltage_probe",
      position: { x: -1, y: 2 },
      schematic_voltage_probe_id: "1",
      schematic_trace_id: "1",
      color: "purple",
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 0, y: 0 },
      schematic_voltage_probe_id: "2",
      schematic_trace_id: "2",
      voltage: 5,
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 1, y: -2 },
      schematic_voltage_probe_id: "3",
      schematic_trace_id: "3",
      voltage: 12,
      color: "#FF00FF", // magenta
    },
    {
      type: "schematic_voltage_probe",
      position: { x: 2, y: 2 },
      schematic_voltage_probe_id: "4",
      schematic_trace_id: "4",
      name: "VCC",
      color: "orange",
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
