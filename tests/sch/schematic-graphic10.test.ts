import { Resvg } from "@resvg/resvg-js"
import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { parseSync } from "svgson"
import {
  findElement,
  findElementWithName,
  getGraphicNamespace,
  getNestedSvg,
  schematicGraphic,
} from "./schematic-graphic-test-helpers"

test("namespaces source classes so host schematic styles cannot restyle them", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_class_isolation",
        svgContent: `<svg viewBox="0 0 20 10">
          <rect class="boundary text" width="20" height="10" fill="#00ff00"/>
        </svg>`,
      }),
    ],
    { width: 200, height: 100 },
  )
  const graphic = findElement(parseSync(svg), "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const namespace = getGraphicNamespace(graphic)
  const sourceRect = findElementWithName(getNestedSvg(graphic), "rect")

  expect(sourceRect?.attributes.class).toBe(
    `${namespace}--class-626f756e64617279 ${namespace}--class-74657874`,
  )

  const pixels = new Resvg(svg, {
    font: { loadSystemFonts: false },
  }).render().pixels
  let greenPixelCount = 0
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (
      (pixels[offset] ?? 0) < 20 &&
      (pixels[offset + 1] ?? 0) > 230 &&
      (pixels[offset + 2] ?? 0) < 20 &&
      (pixels[offset + 3] ?? 0) > 230
    ) {
      greenPixelCount += 1
    }
  }
  expect(greenPixelCount).toBeGreaterThan(10_000)
})
