import { expect, test } from "bun:test"
import { convertCircuitJsonTo3dSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const Components = ({ id = "", layer = "top" as "top" | "bottom" } = {}) => (
  <>
    <resistor
      name={`R${id}`}
      resistance="10kOhm"
      footprint="0402"
      layer={layer}
    ></resistor>
    <capacitor
      name={`C${id}`}
      capacitance="1000pF"
      footprint="0402"
      layer={layer}
      pcbX={4}
    />
  </>
)

test("simple resistor-capactior without trace", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <Components />
    </board>,
  )

  const [top] = convertCircuitJsonTo3dSvg(circuit.getCircuitJson())
  expect(top).toMatchSvgSnapshot(
    import.meta.dirname + "/simple-resistor-capacitor-without-trace",
  )
})

test("simple resistor-capactior with trace", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <Components id="1" />
      <trace from=".R1 > .left" to=".C1 > .right" />
    </board>,
  )

  const [top] = convertCircuitJsonTo3dSvg(circuit.getCircuitJson())
  expect(top).toMatchSvgSnapshot(
    import.meta.dirname + "/simple-resistor-capacitor-with-trace",
  )
})

test("double-layer resistor-capactior without trace", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <Components />
      <Components layer="bottom" />
    </board>,
  )

  const [top, bottom] = convertCircuitJsonTo3dSvg(circuit.getCircuitJson())
  expect(top).toMatchSvgSnapshot(
    import.meta.dirname + "/double-layer-resistor-capacitor-without-trace.top",
  )
  expect(bottom).toMatchSvgSnapshot(
    import.meta.dirname +
      "/double-layer-resistor-capacitor-without-trace.bottom",
  )
})

test("double-layer resistor-capactior with trace", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <Components id="1" />
      <Components id="2" layer="bottom" />
      <trace from=".R1 > .left" to=".C1 > .right" />
      <trace from=".R2 > .right" to=".C2 > .left" />
    </board>,
  )

  const [top, bottom] = convertCircuitJsonTo3dSvg(circuit.getCircuitJson())
  expect(top).toMatchSvgSnapshot(
    import.meta.dirname + "/double-layer-resistor-capacitor-with-trace.top",
  )
  expect(bottom).toMatchSvgSnapshot(
    import.meta.dirname + "/double-layer-resistor-capacitor-with-trace.bottom",
  )
})
