import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"
import { svgAsset } from "./schematic-graphic-test-helpers"

test("reports which schematic graphic contains invalid SVG", () => {
  expect(() =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic: {
        type: "schematic_graphic",
        schematic_graphic_id: "schematic_graphic_invalid",
        asset: svgAsset("not an svg document"),
      },
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    }),
  ).toThrow(
    'Unable to render schematic graphic "schematic_graphic_invalid": asset.url is not valid SVG',
  )

  expect(() =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic: {
        type: "schematic_graphic",
        schematic_graphic_id: "schematic_graphic_wrong_root",
        asset: svgAsset("<g><rect/></g>"),
      },
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    }),
  ).toThrow(
    'Unable to render schematic graphic "schematic_graphic_wrong_root": asset.url is not valid SVG',
  )
})
