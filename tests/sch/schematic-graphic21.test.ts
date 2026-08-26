import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import {
  getRenderedGraphicViewport,
  schematicGraphic,
  schematicSheet,
  systemBlockDiagramSvg,
} from "./schematic-graphic-test-helpers"

test("defaults to and clamps dimensions at the inner-sheet viewport", () => {
  const render = (dimensions?: { width: number; height: number }) =>
    convertCircuitJsonToSchematicSvg(
      [
        schematicSheet("schematic_sheet_sizing", 0),
        schematicGraphic({
          id: "schematic_graphic_sizing",
          sheetId: "schematic_sheet_sizing",
          svgContent: systemBlockDiagramSvg,
          ...dimensions,
        }),
      ],
      { width: 1200, height: 848 },
    )

  const defaultSvg = render()
  const clampedSvg = render({ width: 1_000, height: 1_000 })

  expect(getRenderedGraphicViewport(defaultSvg)).toEqual({
    x: 44.946094,
    y: 37.202853,
    width: 1110.107812,
    height: 773.594294,
  })
  expect(getRenderedGraphicViewport(clampedSvg)).toEqual(
    getRenderedGraphicViewport(defaultSvg),
  )
  expect(clampedSvg).toBe(defaultSvg)
})
