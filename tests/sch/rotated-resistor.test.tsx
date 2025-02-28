import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic rotated resistor", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        name="R1"
        resistance="10k"
        footprint="0402"
        schRotation="90deg"
      />
    </board>,
  )

  expect(
    convertCircuitJsonToSchematicSvg(circuit.getCircuitJson() as any),
  ).toMatchSvgSnapshot(import.meta.path)
})
