import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"
import { getEmbeddedImage, svgAsset } from "./schematic-graphic-test-helpers"

test("prefers the canonical inline asset over svg_content", () => {
  const asset = svgAsset(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect id="canonical" width="10" height="10"/></svg>',
  )
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_asset_precedence",
      asset,
      svg_content:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle id="stale" r="5"/></svg>',
    },
    viewport: { x: 0, y: 0, width: 100, height: 100 },
  })

  expect(getEmbeddedImage(graphic).attributes.href).toBe(asset.url)
})
