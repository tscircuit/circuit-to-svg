import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { createMissingRefdesWarningCircuit } from "./schematic-warning-callouts.fixture"

test("warning callout width remains positive in a tiny viewport", async () => {
  const { circuitJsonWithWarning } = await createMissingRefdesWarningCircuit()
  const svg = convertCircuitJsonToSchematicSvg(circuitJsonWithWarning, {
    width: 10,
    height: 10,
    shouldDrawWarnings: true,
  })
  const callout = svg.match(
    /<rect x="[^"]+" y="[^"]+" width="([^"]+)" height="([^"]+)"[^>]+data-warning-reference="callout"/,
  )

  expect(callout).not.toBeNull()
  expect(Number(callout?.[1])).toBeGreaterThan(0)
  expect(Number(callout?.[2])).toBeGreaterThan(0)
})
