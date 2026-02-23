import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import {
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPcbSvg,
} from "lib/index"

test("pcb_group border color changes for different group", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="20mm" pcbX={0} pcbY={0}>
      <group pcbX={5} pcbY={0}>
        <resistor name="R1" footprint="0402" resistance="1k" />
      </group>
      <group pcbX={-5} pcbY={0}>
        <resistor name="R2" footprint="0402" resistance="1k" />
      </group>
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  expect(
    convertCircuitJsonToPcbSvg(circuitJson as any, { showPcbGroups: true }),
  ).toMatchSvgSnapshot(import.meta.path)
})
