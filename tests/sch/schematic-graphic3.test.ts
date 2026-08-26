import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { svgAsset } from "./schematic-graphic-test-helpers"

test("renders a base64 SVG asset without svg_content", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_base64",
      asset: svgAsset(
        '<svg viewBox="0 0 10 10"><text>BASE64 ASSET — 温度</text></svg>',
        "base64",
      ),
    },
  ])

  expect(svg).toContain("BASE64 ASSET — 温度")
  expect(svg).not.toContain("data:image/svg+xml")
})
