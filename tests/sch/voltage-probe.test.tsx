import { convertCircuitJsonToSchematicSvg } from "lib/sch/convert-circuit-json-to-schematic-svg"
import { test, expect } from "bun:test"
import type { SchematicVoltageProbe } from "circuit-json"

test("should render voltage probe", async () => {
  const circuitJson: SchematicVoltageProbe[] = [
    {
      type: "schematic_voltage_probe",
      position: { x: -1, y: 2 },
      schematic_voltage_probe_id: "1",
      schematic_trace_id: "1",
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
