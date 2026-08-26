import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import {
  SCHEMATIC_UNIT_TO_MM,
  getSchematicSheetLayout,
} from "lib/sch/schematic-sheet-utils"

test("explicit sheet dimensions override the named sheet size", () => {
  const custom = getSchematicSheetLayout("ansi_b", 500, 300)

  expect(custom.width * SCHEMATIC_UNIT_TO_MM).toBeCloseTo(500)
  expect(custom.height * SCHEMATIC_UNIT_TO_MM).toBeCloseTo(300)

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_custom",
      name: "Custom Sheet",
      sheet_size: "a4",
      sheet_width: 500,
      sheet_height: 300,
    },
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      width: 1200,
      height: 800,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
