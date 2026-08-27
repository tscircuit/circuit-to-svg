import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-schematic-graphic"
import {
  decodeSvgDataUrl,
  getEmbeddedImage,
} from "./schematic-graphic-test-helpers"

test("embeds svg_content materialized for an external asset", () => {
  const svgContent =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>'
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_resolved_asset",
      asset: {
        project_relative_path: "assets/system.svg",
        url: "https://example.com/system.svg",
        mimetype: "image/svg+xml",
      },
      svg_content: svgContent,
    },
    viewport: { x: 0, y: 0, width: 100, height: 100 },
  })
  const href = getEmbeddedImage(graphic).attributes.href!

  expect(href).toStartWith("data:image/svg+xml;base64,")
  expect(href).not.toContain("https://example.com/system.svg")
  expect(decodeSvgDataUrl(href)).toBe(svgContent)
})
