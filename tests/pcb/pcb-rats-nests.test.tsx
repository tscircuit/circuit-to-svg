import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { Circuit } from "@tscircuit/core"

const circuit = new Circuit()

circuit.add(
  <board width="20mm" height="20mm">
    <resistor
      name="R0"
      pcbX={-4}
      pcbY={-2}
      footprint="1210"
      resistance="10kohm"
    />
    <resistor
      name="R1"
      pcbX={-4}
      pcbY={0}
      footprint="1210"
      resistance="10kohm"
    />
    <resistor
      name="R2"
      pcbX={2}
      pcbY={3}
      footprint="0603"
      resistance="10kohm"
    />
    <resistor
      name="R3"
      pcbX={0}
      pcbY={6}
      footprint="0805"
      resistance="10kohm"
    />
    <trace path={[".R1 > .right", "net.Ground"]} />
    <trace path={[".R0 > .right", "net.Ground"]} />
    <trace path={["net.Ground", ".R2 > .left"]} />
    <trace path={[".R3 > .left", ".R2 > .right"]} />
  </board>,
)

await circuit.renderUntilSettled()
const circuitJson = circuit.getCircuitJson()

test("shouldDrawRatsNest true", () => {
  expect(
    convertCircuitJsonToPcbSvg(circuitJson as any, {
      shouldDrawRatsNest: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "pcb-trace-error-shouldDrawRatsNest")
})
