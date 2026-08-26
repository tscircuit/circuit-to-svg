import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { parseSync } from "svgson"
import {
  decodeSvgDataUrl,
  findElement,
  getEmbeddedImage,
  schematicGraphic,
  schematicSheet,
  systemBlockDiagramSvg,
  svgAsset,
} from "./schematic-graphic-test-helpers"

test("renders an inline SVG asset as an embedded image", () => {
  const asset = svgAsset(systemBlockDiagramSvg)
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicSheet("schematic_sheet_system", 0),
      schematicGraphic({
        id: "schematic_graphic_system",
        sheetId: "schematic_sheet_system",
        svgContent: systemBlockDiagramSvg,
      }),
    ],
    { width: 1200, height: 848 },
  )

  const graphic = findElement(parseSync(svg), "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const image = getEmbeddedImage(graphic)

  expect(graphic.name).toBe("g")
  expect(graphic.attributes.class).toBe("schematic-graphic")
  expect(graphic.attributes["pointer-events"]).toBe("none")
  expect(graphic.attributes["data-circuit-json-type"]).toBe("schematic_graphic")
  expect(graphic.attributes["data-schematic-sheet-id"]).toBe(
    "schematic_sheet_system",
  )
  expect(image.attributes.href).toBe(asset.url)
  expect(decodeSvgDataUrl(image.attributes.href!)).toContain(
    '<text x="400" y="42" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="700" fill="#0f172a">System Block Diagram</text>',
  )
  expect(image.attributes.preserveAspectRatio).toBe("xMidYMid meet")
  expect(image.attributes["pointer-events"]).toBe("none")
  expect(Number(image.attributes.x)).toBeGreaterThan(0)
  expect(Number(image.attributes.y)).toBeGreaterThan(0)
  expect(Number(image.attributes.width)).toBeLessThan(1200)
  expect(Number(image.attributes.height)).toBeLessThan(848)
  expect(svg).not.toContain("<linearGradient")
  expect(svg).not.toContain(">System Block Diagram</text>")
  expect(svg.indexOf('data-schematic-graphic-id="')).toBeLessThan(
    svg.indexOf('class="schematic-sheet"'),
  )
})
