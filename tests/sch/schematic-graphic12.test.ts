import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"
import {
  findElementWithName,
  getNestedSvg,
  svgAsset,
} from "./schematic-graphic-test-helpers"

test("drops malformed embedded CSS without rejecting the SVG", () => {
  const sourceSvg = `<svg viewBox="0 0 10 10">
    <style>.broken { fill: red</style>
    <rect width="10" height="10" style="fill:red;} .boundary {display:none"/>
  </svg>`
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_bad_css",
      asset: svgAsset(sourceSvg),
    },
    viewport: { x: 0, y: 0, width: 100, height: 100 },
  })
  const nestedSvg = getNestedSvg(graphic)

  expect(findElementWithName(nestedSvg, "rect")).toBeDefined()
  expect(findElementWithName(nestedSvg, "style")).toBeUndefined()
  expect(
    findElementWithName(nestedSvg, "rect")?.attributes.style,
  ).toBeUndefined()
})
