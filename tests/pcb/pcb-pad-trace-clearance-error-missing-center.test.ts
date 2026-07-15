import { expect, test } from "bun:test"
import { checkPadTraceClearance } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import circuitJsonFixture from "../assets/traces-too-close.json"

test("falls back to referenced geometry when the error center is unavailable", () => {
  const circuitJson = [...circuitJsonFixture] as AnyCircuitElement[]
  const [error] = checkPadTraceClearance(circuitJson)
  if (!error) throw new Error("Expected a pad/trace clearance error")

  const svg = convertCircuitJsonToPcbSvg(
    [...circuitJson, { ...error, center: undefined }],
    { shouldDrawErrors: true },
  )

  expect(svg).toContain('data-type="pcb_pad_trace_clearance_error"')
  expect(
    svg.match(/<line\b[^>]*data-type="pcb_pad_trace_clearance_error"[^>]*>/g),
  ).toHaveLength(2)
  expect(svg).toContain(error.message)
})
