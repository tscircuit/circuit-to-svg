import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicSheet } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import {
  SCHEMATIC_UNIT_TO_MM,
  getSchematicSheetLayout,
} from "lib/sch/schematic-sheet-utils"

test("ANSI B schematic sheets render at 17 by 11 inches", () => {
  const a4Sheet: SchematicSheet = {
    type: "schematic_sheet",
    schematic_sheet_id: "schematic_sheet_a4",
    sheet_size: "a4",
    sheet_width: 297,
    sheet_height: 210,
  }
  const ansiBSheet: SchematicSheet = {
    type: "schematic_sheet",
    schematic_sheet_id: "schematic_sheet_ansi_b",
    name: "ANSI B Sheet",
    sheet_size: "ansi_b",
    sheet_width: 431.8,
    sheet_height: 279.4,
  }
  const a4 = getSchematicSheetLayout(a4Sheet)
  const ansiB = getSchematicSheetLayout(ansiBSheet)

  expect(a4.width * SCHEMATIC_UNIT_TO_MM).toBeCloseTo(297)
  expect(a4.height * SCHEMATIC_UNIT_TO_MM).toBeCloseTo(210)
  expect(ansiB.width * SCHEMATIC_UNIT_TO_MM).toBeCloseTo(431.8)
  expect(ansiB.height * SCHEMATIC_UNIT_TO_MM).toBeCloseTo(279.4)

  const circuitJson: AnyCircuitElement[] = [ansiBSheet]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      width: 1200,
      height: 800,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
