import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import {
  getRenderedGraphicViewport,
  schematicGraphic,
} from "./schematic-graphic-test-helpers"

test("centers a schematic graphic with both dimensions", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_both_dimensions",
        svgContent: '<svg viewBox="0 0 2 1"><rect width="2" height="1"/></svg>',
        width: 2,
        height: 1,
      }),
    ],
    { width: 320, height: 180 },
  )

  expect(getRenderedGraphicViewport(svg)).toEqual({
    x: 100,
    y: 60,
    width: 120,
    height: 60,
  })
})
