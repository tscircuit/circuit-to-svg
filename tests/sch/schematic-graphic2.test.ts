import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import {
  schematicGraphic,
  schematicSheet,
} from "./schematic-graphic-test-helpers"

test("schematic graphics follow schematic sheet selection", () => {
  const circuitJson = [
    schematicSheet("schematic_sheet_first", 0),
    schematicGraphic({
      id: "schematic_graphic_first",
      sheetId: "schematic_sheet_first",
      svgContent:
        '<svg viewBox="0 0 100 50"><text>FIRST PAGE DIAGRAM</text></svg>',
    }),
    schematicSheet("schematic_sheet_second", 1),
    schematicGraphic({
      id: "schematic_graphic_second",
      sheetId: "schematic_sheet_second",
      svgContent:
        '<svg viewBox="0 0 100 50"><text>SECOND PAGE DIAGRAM</text></svg>',
    }),
  ]

  const firstPageSvg = convertCircuitJsonToSchematicSvg(circuitJson)
  expect(firstPageSvg).toContain("FIRST PAGE DIAGRAM")
  expect(firstPageSvg).not.toContain("SECOND PAGE DIAGRAM")

  const secondPageSvg = convertCircuitJsonToSchematicSvg(circuitJson, {
    schematicSheetId: "schematic_sheet_second",
  })
  expect(secondPageSvg).toContain("SECOND PAGE DIAGRAM")
  expect(secondPageSvg).not.toContain("FIRST PAGE DIAGRAM")
})
