import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicSheet } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getSchematicSheetLayout } from "lib/sch/schematic-sheet-utils"

test("explicit schematic sheet center controls the rendered layout", () => {
  const center = { x: 12, y: -7 }
  const schematicSheet: SchematicSheet & {
    center: { x: number; y: number }
  } = {
    type: "schematic_sheet",
    schematic_sheet_id: "schematic_sheet_centered",
    name: "Centered Sheet",
    center,
  }

  const layout = getSchematicSheetLayout(schematicSheet)

  expect(layout.center).toEqual(center)
  expect((layout.minX + layout.maxX) / 2).toBeCloseTo(center.x)
  expect((layout.minY + layout.maxY) / 2).toBeCloseTo(center.y)

  expect(
    convertCircuitJsonToSchematicSvg([schematicSheet as AnyCircuitElement], {
      width: 1200,
      height: 800,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
