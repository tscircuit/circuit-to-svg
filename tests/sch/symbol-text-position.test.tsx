import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("Ensure text is in the currect position", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="20mm" pcbX={0} pcbY={0}>
      <battery name="C1" footprint="0805" pcbX={-7} pcbY={-5} schX={0} />
      <potentiometer
        name="C1"
        footprint="0805"
        maxResistance={3}
        pcbX={-7}
        pcbY={-5}
        schX={-5}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson as any, {}),
  ).toMatchSvgSnapshot(`${import.meta.path} - pcb`)
}, 20000)
