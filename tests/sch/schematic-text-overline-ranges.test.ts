import { expect, test } from "bun:test"
import type { SchematicText } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("renders overline ranges as styled tspans", () => {
  const text = {
    type: "schematic_text",
    schematic_text_id: "decorated_text",
    text: "RESET/GPIO",
    overline_ranges: [{ start_index: 0, end_index: 5 }],
    font_size: 0.18,
    position: { x: 0, y: 0 },
    rotation: 0,
    anchor: "center",
    color: "#000000",
  } satisfies SchematicText & {
    overline_ranges: Array<{
      start_index: number
      end_index: number
    }>
  }

  const svg = convertCircuitJsonToSchematicSvg([text])

  expect(svg).toContain('style="text-decoration: overline;"')
  expect(svg).toContain(">RESET</tspan>")
  expect(svg).toContain(">/GPIO</tspan>")
})
