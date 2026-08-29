import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { createMissingRefdesWarningCircuit } from "./schematic-warning-callouts.fixture"

test("schematic warnings are hidden by default", async () => {
  const { circuitJsonWithWarning, warningId } =
    await createMissingRefdesWarningCircuit()
  const svg = convertCircuitJsonToSchematicSvg(circuitJsonWithWarning)

  expect(svg).not.toContain(`data-warning-id="${warningId}"`)
})
