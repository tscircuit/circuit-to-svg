import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { svgAsset } from "./schematic-graphic-test-helpers"

test("prefers the canonical inline asset over svg_content", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_asset_precedence",
      asset: svgAsset(
        '<svg viewBox="0 0 10 10"><text>CANONICAL ASSET</text></svg>',
      ),
      svg_content: '<svg viewBox="0 0 10 10"><text>STALE FALLBACK</text></svg>',
    },
  ])

  expect(svg).toContain("CANONICAL ASSET")
  expect(svg).not.toContain("STALE FALLBACK")
})
