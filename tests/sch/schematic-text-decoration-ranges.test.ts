import { expect, test } from "bun:test"
import type { SchematicText } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("renders text decoration ranges as styled tspans", () => {
  const text = {
    type: "schematic_text",
    schematic_text_id: "decorated_text",
    text: "RESET/GPIO",
    text_decoration_ranges: [{ start: 0, end: 5, decoration: "overline" }],
    font_size: 0.18,
    position: { x: 0, y: 0 },
    rotation: 0,
    anchor: "center",
    color: "#000000",
  } satisfies SchematicText & {
    text_decoration_ranges: Array<{
      start: number
      end: number
      decoration: "overline"
    }>
  }

  const svg = convertCircuitJsonToSchematicSvg([text])

  expect(svg).toContain('style="text-decoration: overline;"')
  expect(svg).toContain(">RESET</tspan>")
  expect(svg).toContain(">/GPIO</tspan>")
})
