import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("a legacy 1.1-unit line spans 10.16 mm on the rendered sheet", () => {
  const circuit: CircuitJson = [
    {
      type: "schematic_sheet",
      schematic_sheet_id: "sheet",
      name: "Calibration",
      sheet_width: 40.64,
      sheet_height: 25.4,
    },
    {
      type: "schematic_line",
      schematic_line_id: "span",
      schematic_sheet_id: "sheet",
      x1: -0.55,
      y1: 0,
      x2: 0.55,
      y2: 0,
      stroke_width: 0.06,
      color: "#840000",
      is_dashed: false,
    },
  ]
  const svg = convertCircuitJsonToSchematicSvg(circuit, {
    width: 640,
    height: 400,
  })
  // The same artwork stored as inches has a 0.4-inch span and proportional pen width.
  const inches: CircuitJson = [
    {
      type: "source_group",
      source_group_id: "g1",
      is_subcircuit: true,
      subcircuit_id: "inches",
      default_schematic_length_unit: "in",
    },
    circuit[0]!,
    {
      ...(circuit[1] as Extract<
        CircuitJson[number],
        { type: "schematic_line" }
      >),
      subcircuit_id: "inches",
      x1: -0.2,
      x2: 0.2,
      stroke_width: (0.06 * 0.4) / 1.1,
    },
  ]
  expect(
    convertCircuitJsonToSchematicSvg(inches, { width: 640, height: 400 }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
