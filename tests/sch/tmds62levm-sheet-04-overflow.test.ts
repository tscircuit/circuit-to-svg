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

test("TMDS62LEVM sheet 04 with overflowing collateral URLs", () => {
  expect(
    circuitJson.some(
      (element) =>
        element.type === "schematic_text" &&
        element.text.includes("e2e.ti.com"),
    ),
  ).toBe(true)

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      height: 600,
      width: 800,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
