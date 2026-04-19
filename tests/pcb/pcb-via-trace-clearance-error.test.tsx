import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb_via_trace_clearance_error shown in pcb snapshot", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="6mm">
      <resistor name="R1" resistance="1k" pcbX={3} pcbY={0} />
      <resistor name="R2" resistance="1k" pcbX={7} pcbY={0} />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson() as any[]

  circuitJson.push({
    type: "pcb_via_trace_clearance_error",
    message: "via and trace too close",
    pcb_via_id: "pcb_via_1",
    pcb_trace_id: "pcb_trace_1",
    minimum_clearance: "0.2mm",
    actual_clearance: "0.1mm",
    center: {
      x: 4.2,
      y: 1.5,
    },
  })

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    shouldDrawErrors: true,
  })

  expect(svg).toContain('data-type="pcb_via_trace_clearance_error"')
  expect(svg).toContain("via and trace too close")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
