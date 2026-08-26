import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("uses svg_content when a non-inline SVG asset has been resolved by the caller", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_resolved_asset",
      asset: {
        project_relative_path: "assets/system.svg",
        url: "https://example.com/system.svg",
        mimetype: "image/svg+xml",
      },
      svg_content: '<svg viewBox="0 0 10 10"><text>RESOLVED SVG</text></svg>',
    },
  ])

  expect(svg).toContain("RESOLVED SVG")
  expect(svg).not.toContain("https://example.com/system.svg")
})
