import { expect, test } from "bun:test"
import type { PcbPadTraceClearanceError } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("pcb_pad_trace_clearance_error shown in pcb snapshot", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board>
      <resistor name="R1" resistance="1k" footprint="0402" />
      <resistor name="R2" resistance="1k" footprint="0402" />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()
  const clearanceError: PcbPadTraceClearanceError = {
    type: "pcb_pad_trace_clearance_error",
    error_type: "pcb_pad_trace_clearance_error",
    pcb_pad_trace_clearance_error_id: "pcb_pad_trace_clearance_error_0",
    message: "pad and trace too close",
    pcb_pad_id: "pcb_smtpad_0",
    pcb_trace_id: "pcb_trace_0",
    minimum_clearance: "0.2mm",
    actual_clearance: "0.1mm",
    center: {
      x: 1.25,
      y: 0,
    },
  }

  const svg = convertCircuitJsonToPcbSvg([...circuitJson, clearanceError], {
    shouldDrawErrors: true,
  })

  expect(svg).toContain('data-type="pcb_pad_trace_clearance_error"')
  expect(svg).toContain("pad and trace too close")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
