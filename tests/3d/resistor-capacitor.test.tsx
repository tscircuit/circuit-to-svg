import { expect, test } from "bun:test"
import { convertCircuitJsonTo3dSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"


const Components = ({ id = "", layer = "top" as "top" | "bottom" } = {}) => <>
  <resistor name={`R${id}`} resistance="10kOhm" footprint="0402" layer={layer}></resistor>
  <capacitor name={`C${id}`} capacitance="1000pF" footprint="0402" layer={layer}
    pcbX={4}
  />
</>

test("simple resistor-capactior without trace", () => {
  const { circuit } = getTestFixture()

  circuit.add(<board width="10mm" height="10mm">
    <Components />
  </board>)

  const svg = convertCircuitJsonTo3dSvg(circuit.getCircuitJson())
  expect(svg).toMatchSvgSnapshot(import.meta.dirname + "/simple-resistor-capacitor-without-trace")
})

test("simple resistor-capactior with trace", () => {
  const { circuit } = getTestFixture()

  circuit.add(<board width="10mm" height="10mm">
    <Components id="1" />
    <trace from=".R1 > .left" to=".C1 > .right" />
  </board>)

  const svg = convertCircuitJsonTo3dSvg(circuit.getCircuitJson())
  expect(svg).toMatchSvgSnapshot(import.meta.dirname + "/simple-resistor-capacitor-with-trace")
})


})
