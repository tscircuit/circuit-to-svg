import { expect, test } from "bun:test"
import { checkPadTraceClearance } from "@tscircuit/checks"
import type { AnyCircuitElement, PcbPadTraceClearanceError } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import circuitJsonFixture from "../assets/traces-too-close.json"

test("renders a real pcb_pad_trace_clearance_error", () => {
  const circuitJson = [...circuitJsonFixture] as AnyCircuitElement[]
  const errors = checkPadTraceClearance(circuitJson)

  expect(errors).toHaveLength(1)
  const error = errors[0]!
  expect(error.type).toBe("pcb_pad_trace_clearance_error")
  expect(error.actual_clearance).toBeLessThan(error.minimum_clearance ?? 0)

  const svg = convertCircuitJsonToPcbSvg([...circuitJson, ...errors], {
    shouldDrawErrors: true,
  })

  expect(svg).toContain('data-type="pcb_pad_trace_clearance_error"')
  expect(svg).toContain('data-error-reference="trace-start"')
  expect(svg).toContain('data-error-reference="trace-end"')
  expect(svg).toContain('data-error-reference="obstacle"')
  expect(svg).toContain(error.message)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

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

test("falls back to referenced geometry when the error center is unavailable", () => {
  const circuitJson = [...circuitJsonFixture] as AnyCircuitElement[]
  const [error] = checkPadTraceClearance(circuitJson)
  if (!error) throw new Error("Expected a pad/trace clearance error")

  const svg = convertCircuitJsonToPcbSvg(
    [...circuitJson, { ...error, center: undefined }],
    { shouldDrawErrors: true },
  )

  expect(svg).toContain('data-type="pcb_pad_trace_clearance_error"')
  expect(svg).toContain('data-error-reference="trace-start"')
  expect(svg).toContain('data-error-reference="trace-end"')
  expect(svg).toContain(error.message)
})
