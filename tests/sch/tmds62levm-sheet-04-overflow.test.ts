import { readFileSync } from "node:fs"
import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

const circuitJson = JSON.parse(
  readFileSync(
    new URL("../fixtures/tmds62levm-sheet-04.json", import.meta.url),
    "utf8",
  ),
) as AnyCircuitElement[]

function readTransform(svg: string): string {
  const match = svg.match(/data-real-to-screen-transform="([^"]+)"/)
  if (!match?.[1]) throw new Error("Schematic SVG has no transform")
  return match[1]
}

test("TMDS62LEVM sheet 04 with overflowing collateral URLs", () => {
  expect(
    circuitJson.some(
      (element) =>
        element.type === "schematic_text" &&
        element.text.includes("e2e.ti.com"),
    ),
  ).toBe(true)

  const sheet = circuitJson.find(
    (element) => element.type === "schematic_sheet",
  )
  if (!sheet) throw new Error("TMDS62LEVM fixture has no schematic sheet")

  const options = { height: 600, width: 800 }
  const svg = convertCircuitJsonToSchematicSvg(circuitJson, options)
  const sheetOnlySvg = convertCircuitJsonToSchematicSvg([sheet], options)

  expect(readTransform(svg)).toBe(readTransform(sheetOnlySvg))
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
