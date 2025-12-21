import { convertCircuitJsonToSchematicSvg } from "lib/sch/convert-circuit-json-to-schematic-svg"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"
import { test, expect } from "bun:test"
import type { SchematicVoltageProbe } from "circuit-json"

test("voltage probe label text should be included in SVG bounds calculation", async () => {
  const circuitJson: SchematicVoltageProbe[] = [
    {
      type: "schematic_voltage_probe",
      position: { x: 0, y: 0 },
      schematic_voltage_probe_id: "1",
      schematic_trace_id: "1",
      name: "VERY_LONG_PROBE_NAME",
      label_alignment: "top_right",
    },
  ]

  const bounds = getSchematicBoundsFromCircuitJson(circuitJson)

  expect(bounds.maxX).toBeGreaterThan(0.5)

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
