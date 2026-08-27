import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicSheet } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { parseSync } from "svgson"
import {
  findElement,
  getEmbeddedImage,
  schematicGraphic,
} from "./schematic-graphic-test-helpers"

test("fills the inner frame of a custom-sized schematic sheet", () => {
  const schematicSheet: SchematicSheet = {
    type: "schematic_sheet",
    schematic_sheet_id: "schematic_sheet_custom_graphic",
    sheet_width: 500,
    sheet_height: 300,
  }
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicSheet,
      schematicGraphic({
        id: "schematic_graphic_custom_sheet",
        sheetId: schematicSheet.schematic_sheet_id,
        svgContent:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3"><rect width="5" height="3"/></svg>',
      }),
    ] as AnyCircuitElement[],
    { width: 1200, height: 800 },
  )
  const root = parseSync(svg)
  const graphic = findElement(root, "data-schematic-graphic-id")
  const innerFrame = findElement(
    root,
    "data-schematic-rect-id",
    `${schematicSheet.schematic_sheet_id}_inner`,
  )
  if (!graphic || !innerFrame) {
    throw new Error("Expected a graphic and custom sheet inner frame")
  }
  const image = getEmbeddedImage(graphic)

  for (const attribute of ["x", "y", "width", "height"] as const) {
    expect(Number(image.attributes[attribute])).toBeCloseTo(
      Number(innerFrame.attributes[attribute]),
      5,
    )
  }
})
