import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("sheet style warnings appear on their sheet when warnings are enabled", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_0",
      name: "Controller",
      sheet_index: 0,
      sheet_width: 500,
      sheet_height: 300,
    },
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_1",
      name: "Power",
      sheet_index: 1,
    },
    {
      type: "schematic_sheet_styling_warning",
      schematic_sheet_styling_warning_id: "schematic_sheet_styling_warning_0",
      warning_type: "schematic_sheet_styling_warning",
      styling_issue_type: "non_default_sheet_size",
      schematic_sheet_id: "schematic_sheet_0",
      message:
        'Schematic sheet "Controller" uses a non-default size (500 × 300 mm).',
    },
  ]
  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    shouldDrawWarnings: true,
    schematicSheetIndex: 0,
  })
  expect(svg).toContain('data-type="schematic_sheet_styling_warning"')
  expect(svg).toContain('data-warning-reference="target"')
  expect(svg).toContain("500 × 300 mm")
  expect(convertCircuitJsonToSchematicSvg(circuitJson)).not.toContain(
    'data-type="schematic_sheet_styling_warning"',
  )
  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      shouldDrawWarnings: true,
      schematicSheetIndex: 1,
    }),
  ).not.toContain('data-type="schematic_sheet_styling_warning"')
})
