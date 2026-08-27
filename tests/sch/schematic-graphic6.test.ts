import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-schematic-graphic"
import { getEmbeddedImage, svgAsset } from "./schematic-graphic-test-helpers"

test("passes a canonical base64 SVG asset through without decoding it", () => {
  const asset = svgAsset(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text>BASE64 — 温度</text></svg>',
    "base64",
  )
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_base64",
      asset,
    },
    viewport: { x: 0, y: 0, width: 100, height: 100 },
  })

  expect(getEmbeddedImage(graphic).attributes.href).toBe(asset.url)
})
