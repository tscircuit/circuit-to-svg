import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"
import {
  collectAttributeValues,
  getNestedSvg,
  stringifyTree,
  svgAsset,
} from "./schematic-graphic-test-helpers"

test("preserves embedded static raster images but strips active and external images", () => {
  const pngDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  const sourceSvg = `<svg viewBox="0 0 10 10">
    <image id="safe" href="${pngDataUrl}"/>
    <image id="external" href="https://example.com/logo.png"/>
    <image id="active" href="data:image/svg+xml;base64,PHN2Zy8+"/>
    <image id="animated" href="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="/>
  </svg>`
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_embedded_images",
      asset: svgAsset(sourceSvg),
    },
    viewport: { x: 0, y: 0, width: 100, height: 100 },
  })
  const nestedSvg = getNestedSvg(graphic)
  const hrefs = collectAttributeValues(nestedSvg, "href")

  expect(hrefs).toEqual([pngDataUrl])
  expect(stringifyTree(nestedSvg)).not.toContain("https://example.com")
  expect(stringifyTree(nestedSvg)).not.toContain("data:image/svg+xml")
  expect(stringifyTree(nestedSvg)).not.toContain("data:image/gif")
})
