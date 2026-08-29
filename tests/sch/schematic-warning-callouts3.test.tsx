import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { createMultipleMissingRefdesWarningCircuit } from "./schematic-warning-callouts.fixture"

test("multiple real TSX warnings use distinct callout placements", async () => {
  const { circuitJsonWithWarnings, warningIds } =
    await createMultipleMissingRefdesWarningCircuit()
  const svg = convertCircuitJsonToSchematicSvg(circuitJsonWithWarnings, {
    width: 1000,
    height: 600,
    grid: true,
    shouldDrawWarnings: true,
  })

  expect(svg.match(/class="schematic-warning"/g)).toHaveLength(2)
  for (const warningId of warningIds) {
    expect(svg).toContain(`data-warning-id="${warningId}"`)
  }
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "multiple-custom-symbol-missing-refdes-warnings",
  )
})
