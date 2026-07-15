import { expect, test } from "bun:test"
import { checkPadTraceClearance } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
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
  expect(
    svg.match(/<line\b[^>]*data-type="pcb_pad_trace_clearance_error"[^>]*>/g),
  ).toHaveLength(2)
  expect(svg).not.toContain('data-type="pcb_trace_error"')
  expect(svg).toContain(error.message)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
