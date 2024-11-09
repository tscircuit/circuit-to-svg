import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic trace overlap", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor
        name="R1"
        resistance="10k"
        footprint="0402"
        schX={0}
        schY={-2}
      />
      <resistor
        name="R2"
        resistance="10k"
        footprint="0402"
        schX={-2}
        schY={-1}
      />
      <resistor name="R3" resistance="10k" footprint="0402" schX={0} schY={2} />

      <trace from=".R1 > .pin2" to=".R3 > .pin1" />
      <trace from=".R2 > .pin2" to=".R3 > .pin2" />
      <trace from=".R1 > .pin1" to=".R3 > .pin1" />
    </board>,
  )

  expect(
    convertCircuitJsonToSchematicSvg(circuit.getCircuitJson()),
  ).toMatchSvgSnapshot(import.meta.path)
})
