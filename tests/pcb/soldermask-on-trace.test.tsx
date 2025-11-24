import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("should render soldermask on a trace", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board>
      <resistor name="R1" footprint="0402" resistance="10kohm" />
      <capacitor name="C1" footprint="0402" capacitance="10uF" />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />
    </board>,
  )
  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showSolderMask: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
