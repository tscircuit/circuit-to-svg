import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-schematic-graphic"
import {
  decodeSvgDataUrl,
  getEmbeddedImage,
} from "./schematic-graphic-test-helpers"

test("encodes svg_content as an opaque UTF-8 SVG data URL", () => {
  const svgContent =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text>Temperature — 温度 🌡️</text></svg>'
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_content_only",
      svg_content: svgContent,
    },
    viewport: { x: 10, y: 20, width: 300, height: 200 },
  })
  const image = getEmbeddedImage(graphic)

  expect(image.attributes.href).toStartWith("data:image/svg+xml;base64,")
  expect(decodeSvgDataUrl(image.attributes.href!)).toBe(svgContent)
  expect(image.children).toEqual([])
})
