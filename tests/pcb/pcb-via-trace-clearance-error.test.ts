import { expect, test } from "bun:test"
import { checkViaTraceClearance } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import circuitJsonFixture from "../assets/via-too-close-to-trace.json"

test("renders a real pcb_via_trace_clearance_error", () => {
  const circuitJson = [...circuitJsonFixture] as AnyCircuitElement[]
  const errors = checkViaTraceClearance(circuitJson)

  expect(errors).toHaveLength(1)
  const error = errors[0]!
  expect(error.type).toBe("pcb_via_trace_clearance_error")
  expect(error.actual_clearance).toBeLessThan(error.minimum_clearance ?? 0)

  const svg = convertCircuitJsonToPcbSvg([...circuitJson, ...errors], {
    shouldDrawErrors: true,
  })

  expect(svg).toContain('data-type="pcb_via_trace_clearance_error"')
  expect(svg).toContain('data-error-reference="trace-start"')
  expect(svg).toContain('data-error-reference="trace-end"')
  expect(svg).toContain('data-error-reference="obstacle"')
  expect(svg).toContain(error.message)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
