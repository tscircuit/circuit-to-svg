import { Resvg } from "@resvg/resvg-js"
import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { readPixel, schematicGraphic } from "./schematic-graphic-test-helpers"

test("embedded images isolate source classes and repeated IDs", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_red",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1">
          <defs><linearGradient id="paint"><stop stop-color="#ff0000"/></linearGradient></defs>
          <style>.boundary { fill: url(#paint) }</style>
          <rect class="boundary" width="2" height="1"/>
        </svg>`,
      }),
      schematicGraphic({
        id: "schematic_graphic_blue",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1">
          <defs><linearGradient id="paint"><stop stop-color="#0000ff"/></linearGradient></defs>
          <style>.boundary { fill: url(#paint) }</style>
          <rect class="boundary" x="1" width="1" height="1"/>
        </svg>`,
      }),
    ],
    { width: 200, height: 100 },
  )

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
