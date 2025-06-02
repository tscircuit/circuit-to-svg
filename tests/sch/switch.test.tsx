import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic switch", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <switch name="SW3" type="spdt" schX={0} schY={-3} />
      <transistor name="Q2" type="pnp" schRotation={270} />
    </board>,
  )

  expect(
    convertCircuitJsonToSchematicSvg(
      circuit.getCircuitJson() as AnyCircuitElement[],
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
