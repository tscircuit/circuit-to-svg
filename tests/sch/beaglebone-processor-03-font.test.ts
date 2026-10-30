import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { readBeagleboneProcessor } from "tests/fixtures/read-beaglebone-processor"

test("preserves the authored font on BeagleBone's first processor unit", async () => {
  const circuitJson = await readBeagleboneProcessor("03")
  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    width: 1000,
    height: 900,
  })

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
  expect(svg.includes('font-family="Times New Roman"')).toBe(true)
})
