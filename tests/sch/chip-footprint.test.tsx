import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic chip", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <chip name="U1" footprint="1206" />
    </board>,
  )
  const circuitJson = circuit.getCircuitJson()

  const svg = convertCircuitJsonToSchematicSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
