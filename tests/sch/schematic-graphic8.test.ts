import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import {
  getRenderedGraphicViewport,
  schematicGraphic,
  schematicSheet,
} from "./schematic-graphic-test-helpers"

test("centers and clamps optional dimensions within the graphic viewport", () => {
  const renderStandalone = (dimensions?: { width?: number; height?: number }) =>
    convertCircuitJsonToSchematicSvg(
      [
        schematicGraphic({
          id: "schematic_graphic_sizing",
          svgContent:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"><rect width="2" height="1"/></svg>',
          ...dimensions,
        }),
      ],
      { width: 320, height: 180 },
    )

  expect(getRenderedGraphicViewport(renderStandalone({ width: 2 }))).toEqual({
    x: 100,
    y: 0,
    width: 120,
    height: 180,
  })
  expect(getRenderedGraphicViewport(renderStandalone({ height: 1 }))).toEqual({
    x: 0,
    y: 60,
    width: 320,
    height: 60,
  })
  expect(
    getRenderedGraphicViewport(renderStandalone({ width: 2, height: 1 })),
  ).toEqual({ x: 100, y: 60, width: 120, height: 60 })
  expect(getRenderedGraphicViewport(renderStandalone())).toEqual({
    x: 0,
    y: 0,
    width: 320,
    height: 180,
  })

  const renderSheet = (dimensions?: { width?: number; height?: number }) =>
    convertCircuitJsonToSchematicSvg(
      [
        schematicSheet("schematic_sheet_sizing", 0),
        schematicGraphic({
          id: "schematic_graphic_sizing",
          sheetId: "schematic_sheet_sizing",
          svgContent:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"><rect width="2" height="1"/></svg>',
          ...dimensions,
        }),
      ],
      { width: 1200, height: 848 },
    )
  const defaultSheetSvg = renderSheet()
  const clampedSheetSvg = renderSheet({ width: 1_000, height: 1_000 })

  expect(getRenderedGraphicViewport(defaultSheetSvg)).toEqual({
    x: 44.946094,
    y: 37.202853,
    width: 1110.107812,
    height: 773.594294,
  })
  expect(getRenderedGraphicViewport(clampedSheetSvg)).toEqual(
    getRenderedGraphicViewport(defaultSheetSvg),
  )
  expect(clampedSheetSvg).toBe(defaultSheetSvg)
})
