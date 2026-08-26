import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"
import { getNestedSvg, getNodeText } from "./schematic-graphic-test-helpers"

test("renders svg_content without an asset", () => {
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_content_only",
      svg_content:
        '<svg viewBox="0 0 10 10"><text>SVG CONTENT ONLY</text></svg>',
    },
    viewport: { x: 0, y: 0, width: 100, height: 100 },
  })

  expect(getNodeText(getNestedSvg(graphic))).toContain("SVG CONTENT ONLY")
})
