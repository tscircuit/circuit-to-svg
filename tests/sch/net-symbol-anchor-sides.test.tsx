import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic net symbols with different anchor sides", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="30mm" height="30mm">
      {/* Test symbols with different anchor sides */}
      <resistor
        name="R1"
        resistance="10k"
        footprint="0402"
        schX={-5}
        schY={0}
      />
      <resistor name="R2" resistance="10k" footprint="0402" schX={5} schY={0} />
      <resistor
        name="R3"
        resistance="10k"
        footprint="0402"
        schX={0}
        schY={-5}
      />
      <resistor name="R4" resistance="10k" footprint="0402" schX={0} schY={5} />

      {/* Test different anchor sides with ground symbols */}
      <trace schDisplayLabel="GND_LEFT" from=".R1 > .pin1" to="net.GND" />
      <trace schDisplayLabel="GND_RIGHT" from=".R2 > .pin1" to="net.GND" />
      <trace schDisplayLabel="GND_TOP" from=".R3 > .pin1" to="net.GND" />
      <trace schDisplayLabel="GND_BOTTOM" from=".R4 > .pin1" to="net.GND" />
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

  // Verify that path elements are present
  expect(svg).toContain("<path")

  // Verify that text elements are present
  expect(svg).toContain("<text")
})
