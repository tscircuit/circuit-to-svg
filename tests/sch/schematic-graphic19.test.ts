import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import {
  getRenderedGraphicViewport,
  schematicGraphic,
} from "./schematic-graphic-test-helpers"

test("centers a height-only schematic graphic within the available width", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_height_only",
        svgContent: '<svg viewBox="0 0 2 1"><rect width="2" height="1"/></svg>',
        height: 1,
      }),
    ],
    { width: 320, height: 180 },
  )

  expect(getRenderedGraphicViewport(svg)).toEqual({
    x: 0,
    y: 60,
    width: 320,
    height: 60,
  })
})
