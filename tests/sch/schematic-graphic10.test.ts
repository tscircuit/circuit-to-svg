import { Resvg } from "@resvg/resvg-js"
import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { readPixel, schematicGraphic } from "./schematic-graphic-test-helpers"

// Keep this smoke test shape-only: Resvg 2.6.2 does not render text inside an
// SVG data URL used by an <image>. Structural tests verify text is retained in
// the embedded source even though the current Resvg raster path omits it.
test("Resvg renders shapes from an embedded SVG image (shapes-only smoke test)", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_rendered",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1">
          <rect width="1" height="1" fill="#ff0000"/>
          <path d="M1 0h1v1H1z" fill="#0000ff"/>
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
