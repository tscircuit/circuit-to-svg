import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import {
  getRenderedGraphicViewport,
  schematicGraphic,
} from "./schematic-graphic-test-helpers"

test("centers a width-only schematic graphic within the available height", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_width_only",
        svgContent: '<svg viewBox="0 0 2 1"><rect width="2" height="1"/></svg>',
        width: 2,
      }),
    ],
    { width: 320, height: 180 },
  )

  expect(getRenderedGraphicViewport(svg)).toEqual({
    x: 100,
    y: 0,
    width: 120,
    height: 180,
  })
})
