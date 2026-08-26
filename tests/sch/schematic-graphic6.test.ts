import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"
import { getNestedSvg, svgAsset } from "./schematic-graphic-test-helpers"

test("derives a viewBox from absolute SVG dimensions", () => {
  const sourceSvg =
    '<svg width="25.4mm" height="1in" preserveAspectRatio="xMinYMin slice"><rect width="96" height="96"/></svg>'
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_dimensions",
      asset: svgAsset(sourceSvg),
    },
    viewport: { x: 10, y: 20, width: 300, height: 200 },
  })
  const nestedSvg = getNestedSvg(graphic)

  expect(nestedSvg.attributes.viewBox).toBe("0 0 96 96")
  expect(nestedSvg.attributes.preserveAspectRatio).toBe("xMinYMin slice")
  expect(nestedSvg.attributes.x).toBe("10")
  expect(nestedSvg.attributes.y).toBe("20")
  expect(nestedSvg.attributes.width).toBe("300")
  expect(nestedSvg.attributes.height).toBe("200")
})
