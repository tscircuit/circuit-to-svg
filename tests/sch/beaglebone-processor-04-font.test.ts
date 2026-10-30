import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { readBeagleboneProcessor } from "tests/fixtures/read-beaglebone-processor"

test("preserves the authored font on BeagleBone's second processor unit", async () => {
  const circuitJson = await readBeagleboneProcessor("04")
  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    width: 1200,
    height: 700,
  })

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
  expect(svg.includes('font-family="Times New Roman"')).toBe(true)
})
