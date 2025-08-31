import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic net symbols with different symbol types", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="40mm" height="30mm">
      {/* Test ground symbol */}
      <resistor
        name="R1"
        resistance="10k"
        footprint="0402"
        schX={-10}
        schY={-5}
      />
      <trace schDisplayLabel="GND" from=".R1 > .pin1" to="net.GND" />

      {/* Test another ground symbol */}
      <resistor
        name="R2"
        resistance="10k"
        footprint="0402"
        schX={10}
        schY={-5}
      />
      <trace schDisplayLabel="GND2" from=".R2 > .pin1" to="net.GND2" />

      {/* Test another ground symbol */}
      <resistor
        name="R3"
        resistance="10k"
        footprint="0402"
        schX={-10}
        schY={5}
      />
      <trace schDisplayLabel="GND3" from=".R3 > .pin1" to="net.GND3" />

      {/* Test another ground symbol */}
      <resistor
        name="R4"
        resistance="10k"
        footprint="0402"
        schX={10}
        schY={5}
      />
      <trace schDisplayLabel="GND4" from=".R4 > .pin1" to="net.GND4" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  const svg = convertCircuitJsonToSchematicSvg(circuitJson as any)

  // Verify that the SVG was generated successfully
  expect(svg).toBeDefined()
  expect(typeof svg).toBe("string")
  expect(svg.length).toBeGreaterThan(0)

  // Verify that ground symbols are rendered
  expect(svg).toContain("ground") // Ground symbol should be present

  // Verify that the SVG contains proper path elements for symbols
  expect(svg).toContain("<path") // Should contain path elements for symbol rendering

  // Verify that text elements are present for labels
  expect(svg).toContain("<text") // Should contain text elements for labels
})
