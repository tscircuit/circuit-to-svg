import { expect, test } from "bun:test"
import {
  MM_PER_SCHEMATIC_UNIT,
  type AnyCircuitElement,
  type SchematicSheet,
} from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getSchematicSheetLayout } from "lib/sch/schematic-sheet-utils"

test("explicit sheet dimensions control the rendered layout", () => {
  const schematicSheet: SchematicSheet = {
    type: "schematic_sheet",
    schematic_sheet_id: "schematic_sheet_custom",
    name: "Custom Sheet",
    sheet_width: 500,
    sheet_height: 300,
  }
  const custom = getSchematicSheetLayout(schematicSheet)

  expect(custom.width * MM_PER_SCHEMATIC_UNIT).toBeCloseTo(500)
  expect(custom.height * MM_PER_SCHEMATIC_UNIT).toBeCloseTo(300)

  const circuitJson: AnyCircuitElement[] = [schematicSheet]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      width: 1200,
      height: 800,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
