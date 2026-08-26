import { expect, test } from "bun:test"
import type { SchematicGraphic } from "circuit-json"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"
import { getNestedSvg, getNodeText } from "./schematic-graphic-test-helpers"

test("retains runtime compatibility with legacy svg_content", () => {
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_legacy",
      svg_content: '<svg viewBox="0 0 10 10"><text>LEGACY CONTENT</text></svg>',
    } as unknown as SchematicGraphic,
    viewport: { x: 0, y: 0, width: 100, height: 100 },
  })

  expect(getNodeText(getNestedSvg(graphic))).toContain("LEGACY CONTENT")
})
