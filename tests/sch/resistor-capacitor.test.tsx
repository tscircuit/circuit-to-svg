import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic resistor", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance="10" footprint="0402" pcbX={-3} />
      <capacitor
        name="C1"
        capacitance="10uF"
        footprint="0402"
        pcbX={3}
        layer="bottom"
      />
      <trace from=".R1 .pin1" to=".C1 .pin1" />
    </board>,
  )

  expect(
    convertCircuitJsonToPcbSvg(circuit.getCircuitJson()),
  ).toMatchSvgSnapshot(import.meta.path)
})
