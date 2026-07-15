import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbPadTraceClearanceError } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import circuitJsonFixture from "../assets/traces-too-close.json"

test("falls back to the supplied center when references are unavailable", () => {
  const circuitJson = [...circuitJsonFixture] as AnyCircuitElement[]
  const error: PcbPadTraceClearanceError = {
    type: "pcb_pad_trace_clearance_error",
    error_type: "pcb_pad_trace_clearance_error",
    pcb_pad_trace_clearance_error_id: "missing_reference_error",
    pcb_pad_id: "missing_pad",
    pcb_trace_id: "missing_trace",
    message: "missing reference clearance error",
    center: { x: 0, y: 0 },
  }

  const svg = convertCircuitJsonToPcbSvg([...circuitJson, error], {
    shouldDrawErrors: true,
  })

  expect(svg).toContain('data-type="pcb_pad_trace_clearance_error"')
  expect(svg).toContain(error.message)
  expect(svg).not.toContain("data-error-reference")
})
