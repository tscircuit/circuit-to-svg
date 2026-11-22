import { expect, test } from "bun:test"
import type { CircuitJson, SchematicLine } from "circuit-json"
import {
  convertCircuitJsonToSchematicSvg,
  convertCircuitJsonToStackedSchematicSheetsSvg,
} from "lib/index"

test("legacy, mm and inch records draw equal 10.16 mm spans on a sheet", () => {
  const legacyLine: SchematicLine = {
    type: "schematic_line",
    schematic_line_id: "legacy",
    schematic_sheet_id: "sheet",
    x1: -0.55,
    y1: 0,
    x2: 0.55,
    y2: 0,
    stroke_width: 0.055,
    color: "#840000",
    is_dashed: false,
  }
  const sheet = {
    type: "schematic_sheet" as const,
    schematic_sheet_id: "sheet",
    name: "Equal spans",
    sheet_width: 40.64,
    sheet_height: 25.4,
  }
  const circuit: CircuitJson = [
    sheet,
    {
      type: "source_group",
      source_group_id: "g",
      is_subcircuit: true,
      subcircuit_id: "s",
      default_schematic_length_unit: "in",
    },
    { ...legacyLine, subcircuit_id: "s" },
    {
      ...legacyLine,
      schematic_line_id: "mm",
      schematic_length_unit: "mm",
      x1: -5.08,
      x2: 5.08,
      y1: 5.08,
      y2: 5.08,
      stroke_width: 0.508,
    },
    {
      ...legacyLine,
      schematic_line_id: "inch",
      schematic_length_unit: "in",
      x1: -0.2,
      x2: 0.2,
      y1: -0.2,
      y2: -0.2,
      stroke_width: 0.02,
    },
  ]
  const reference: CircuitJson = [
    ...circuit.slice(0, 3),
    { ...legacyLine, schematic_line_id: "mm", y1: 0.55, y2: 0.55 },
    { ...legacyLine, schematic_line_id: "inch", y1: -0.55, y2: -0.55 },
  ]
  const options = { width: 640, height: 400 }
  const svg = convertCircuitJsonToSchematicSvg(circuit, options)
  expect(svg).toBe(convertCircuitJsonToSchematicSvg(reference, options))
  expect(svg).toMatchSvgSnapshot(import.meta.path)
  const secondSheet = { ...sheet, schematic_sheet_id: "sheet2", sheet_index: 1 }
  expect(
    convertCircuitJsonToStackedSchematicSheetsSvg(
      [...circuit, secondSheet],
      options,
    ),
  ).toBe(
    convertCircuitJsonToStackedSchematicSheetsSvg(
      [...reference, secondSheet],
      options,
    ),
  )
})
