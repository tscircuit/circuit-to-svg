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
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50"/></svg>',
    }),
    schematicSheet("schematic_sheet_second", 1),
    schematicGraphic({
      id: "schematic_graphic_second",
      sheetId: "schematic_sheet_second",
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><circle cx="50" cy="25" r="20"/></svg>',
    }),
  ]

  const firstPageSvg = convertCircuitJsonToSchematicSvg(circuitJson)
  expect(firstPageSvg).toContain(
    'data-schematic-graphic-id="schematic_graphic_first"',
  )
  expect(firstPageSvg).not.toContain(
    'data-schematic-graphic-id="schematic_graphic_second"',
  )

  const secondPageSvg = convertCircuitJsonToSchematicSvg(circuitJson, {
    schematicSheetId: "schematic_sheet_second",
  })
  expect(secondPageSvg).toContain(
    'data-schematic-graphic-id="schematic_graphic_second"',
  )
  expect(secondPageSvg).not.toContain(
    'data-schematic-graphic-id="schematic_graphic_first"',
  )
})
