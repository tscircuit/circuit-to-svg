import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { parseSync } from "svgson"
import {
  decodeSvgDataUrl,
  findElement,
  getEmbeddedImage,
} from "./schematic-graphic-test-helpers"

test("keeps parser-invalid and active SVG markup opaque inside the image href", () => {
  const opaqueSource = '<svg><script>alert("opaque")</script><g'
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_opaque_source",
      svg_content: opaqueSource,
    },
  ])

  const graphic = findElement(parseSync(svg), "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const image = getEmbeddedImage(graphic)

  expect(decodeSvgDataUrl(image.attributes.href!)).toBe(opaqueSource)
  expect(svg).not.toContain("<script")
  expect(svg).not.toContain("<g<")
})
