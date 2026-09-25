import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

function readTransform(svg: string): string {
  const match = svg.match(/data-real-to-screen-transform="([^"]+)"/)
  if (!match?.[1]) throw new Error("Schematic SVG has no transform")
  return match[1]
}

test("schematic sheet dimensions control bounds for overflowing text", () => {
  const sheet: AnyCircuitElement = {
    type: "schematic_sheet",
    schematic_sheet_id: "schematic_sheet_1",
    name: "Overflow bounds",
  }
  const overflowingText = {
    type: "schematic_text",
    schematic_text_id: "schematic_text_long_url",
    schematic_sheet_id: "schematic_sheet_1",
    text: "https://example.com/very-long-reference/".repeat(12),
    position: { x: 0, y: 0 },
    anchor: "left",
    rotation: 0,
    font_size: 0.2,
    color: "#006464",
  } satisfies AnyCircuitElement
  const options = { height: 600, width: 800 }

  const sheetOnlySvg = convertCircuitJsonToSchematicSvg([sheet], options)
  const overflowSvg = convertCircuitJsonToSchematicSvg(
    [sheet, overflowingText],
    options,
  )

  expect(readTransform(overflowSvg)).toBe(readTransform(sheetOnlySvg))
  expect(overflowSvg).toContain(overflowingText.text)
  expect(overflowSvg).toMatchSvgSnapshot(import.meta.path)
})
