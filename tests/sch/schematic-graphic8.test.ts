import { Resvg } from "@resvg/resvg-js"
import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { parseSync } from "svgson"
import {
  findElement,
  getNestedSvg,
  readPixel,
  schematicGraphic,
} from "./schematic-graphic-test-helpers"

test("source root overrides cannot escape the fitted viewport", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_root_fit",
        svgContent: `<svg viewBox="0 0 100 50" transform="translate(500 500) scale(20)"
          style="width:9999px!important;height:9999px!important;transform:translate(200px, 200px) scale(50)!important;position:fixed!important;inset:0!important">
          <style>svg { width: 9999px !important; height: 9999px !important; transform: scale(50) !important }</style>
          <rect width="50" height="50" fill="#ff0000"/>
          <rect x="50" width="50" height="50" fill="#0000ff"/>
        </svg>`,
      }),
    ],
    { width: 200, height: 100 },
  )
  const graphic = findElement(parseSync(svg), "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const nestedSvg = getNestedSvg(graphic)

  expect(nestedSvg.name).toBe("svg")
  expect(nestedSvg.attributes.transform).toBeUndefined()
  expect(nestedSvg.attributes.x).toBe("0")
  expect(nestedSvg.attributes.y).toBe("0")
  expect(nestedSvg.attributes.width).toBe("200")
  expect(nestedSvg.attributes.height).toBe("100")
  expect(nestedSvg.attributes.overflow).toBe("hidden")
  expect(graphic.attributes["pointer-events"]).toBe("none")
  expect(nestedSvg.attributes.style).toContain("width:200px!important")
  expect(nestedSvg.attributes.style).toContain("height:100px!important")
  expect(nestedSvg.attributes.style).toContain("transform:none!important")

  const rendered = new Resvg(svg, {
    font: { loadSystemFonts: false },
  }).render()
  expect(readPixel(rendered.pixels, rendered.width, 50, 50)).toEqual([
    255, 0, 0, 255,
  ])
  expect(readPixel(rendered.pixels, rendered.width, 150, 50)).toEqual([
    0, 0, 255, 255,
  ])
})
