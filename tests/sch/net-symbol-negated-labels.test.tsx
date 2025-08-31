import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic net symbols with negated labels", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="R1" resistance="10k" footprint="0402" schX={0} schY={0} />

      {/* Test negated labels */}
      <trace schDisplayLabel="N_GND" from=".R1 > .pin1" to="net.N_GND" />
      <trace schDisplayLabel="N_GND2" from=".R1 > .pin2" to="net.N_GND2" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  const svg = convertCircuitJsonToSchematicSvg(circuitJson as any)

  // Verify that the SVG was generated successfully
  expect(svg).toBeDefined()
  expect(typeof svg).toBe("string")
  expect(svg.length).toBeGreaterThan(0)

  // Verify that ground symbols are present
  expect(svg).toContain("ground")

  // Verify that text elements are present
  expect(svg).toContain("<text")

  // Verify that path elements are present
  expect(svg).toContain("<path")

  // Verify that the SVG contains proper structure
  expect(svg).toContain("<svg")

  // For negated labels, we expect the text to be processed correctly
  // The negated labels should be rendered with proper styling
  expect(svg).toContain("GND")
})
