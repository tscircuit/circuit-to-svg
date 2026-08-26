import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"
import { getNestedSvg, svgAsset } from "./schematic-graphic-test-helpers"

test("uses SVG intrinsic dimension fallbacks for non-absolute lengths", () => {
  const sourceSvg =
    '<svg width="100%" height="auto"><rect width="10" height="10"/></svg>'
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_fallback_dimensions",
      asset: svgAsset(sourceSvg),
    },
    viewport: { x: 0, y: 0, width: 300, height: 150 },
  })

  expect(getNestedSvg(graphic).attributes.viewBox).toBe("0 0 300 150")
})
