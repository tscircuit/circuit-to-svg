import { expect, test, describe } from "bun:test"
import sharedCircuitJsonFixture from "../assets/traces-too-close.json"
import { convertCircuitJsonToPcbSvg } from "lib/index"
import { checkEachPcbTraceNonOverlapping } from "@tscircuit/checks"

describe("PCB traces in non-overlapping trace checks", () => {
  test("Should draw error as two traces are too close", async () => {
    const circuitJsonFixture = structuredClone(sharedCircuitJsonFixture)
    const errors = checkEachPcbTraceNonOverlapping(circuitJsonFixture as any)

    expect(errors).toMatchInlineSnapshot(`
      [
        {
          "center": {
            "x": -0.6877720255648351,
            "y": -0.07159251656145789,
          },
          "error_type": "pcb_trace_error",
          "message": "PCB trace trace[.R1 > port.pos, .C1 > port.pos] is too close to trace[.R1 > port.neg, .C1 > port.neg] (gap: 0.016mm)",
          "pcb_component_ids": [],
          "pcb_port_ids": [
            "pcb_port_0",
            "pcb_port_2",
            "pcb_port_1",
            "pcb_port_3",
          ],
          "pcb_trace_error_id": "overlap_source_trace_1_0_source_trace_0_0",
          "pcb_trace_id": "source_trace_1_0",
          "source_trace_id": "",
          "type": "pcb_trace_error",
        },
      ]
    `)
    expect(errors.length).toBeGreaterThan(0)
    const svg = convertCircuitJsonToPcbSvg(
      [...circuitJsonFixture, ...errors] as any,
      {
        shouldDrawErrors: true,
      },
    )
    await expect(svg).toMatchSvgSnapshot(import.meta.path)
  })
})
