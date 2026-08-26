import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"

test("reports a missing schematic graphic source", () => {
  expect(() =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic: {
        type: "schematic_graphic",
        schematic_graphic_id: "schematic_graphic_without_source",
      },
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    }),
  ).toThrow(
    'Unable to render schematic graphic "schematic_graphic_without_source": asset or svg_content is required',
  )
})
