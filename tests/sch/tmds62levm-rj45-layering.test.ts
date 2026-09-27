import { readFileSync } from "node:fs"
import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

const circuitJson = JSON.parse(
  readFileSync(
    new URL("../fixtures/tmds62levm-sheet-32-rj45.json", import.meta.url),
    "utf8",
  ),
) as AnyCircuitElement[]

test("TMDS62LEVM RJ45 preserves native symbol detail above its body", () => {
  const bodyIndex = circuitJson.findIndex(
    (element) =>
      element.type === "schematic_rect" &&
      element.schematic_rect_id === "schematic_rect_altium_4205",
  )
  const firstDetailIndex = circuitJson.findIndex(
    (element) => element.type === "schematic_line",
  )

  // The real Altium symbol stores its filled body after its linework.
  expect(bodyIndex).toBeGreaterThan(firstDetailIndex)

  expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
