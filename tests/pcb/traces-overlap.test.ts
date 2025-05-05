import { expect, test, describe } from "bun:test"
import circuitJson from "../assets/traces-too-close.json"
import { convertCircuitJsonToPcbSvg } from "lib/index"
import { checkEachPcbTraceNonOverlapping } from "@tscircuit/checks"

describe("PCB traces in non-overlapping trace checks", () => {
  test("Should draw error as two traces are too close", async () => {
    const errors = checkEachPcbTraceNonOverlapping(circuitJson as any)
    circuitJson.push(...(errors as any))

    expect(errors).toMatchInlineSnapshot(`
      [
        {
          "center": {
            "x": -2.8,
            "y": -1.5972222222222219,
          },
          "error_type": "pcb_trace_error",
          "message": "PCB trace trace[source_trace_1_0] overlaps with pcb_smtpad "pcb_port[.C1 > .cathode]" (gap: 0.092mm)",
          "pcb_component_ids": [
            "pcb_component_1",
          ],
          "pcb_port_ids": [
            "pcb_port_3",
          ],
          "pcb_trace_error_id": "overlap_source_trace_1_0_pcb_smtpad_3",
          "pcb_trace_id": "source_trace_1_0",
          "source_trace_id": "",
          "type": "pcb_trace_error",
        },
        {
          "center": {
            "x": -0.6877720255648351,
            "y": -0.07159251656145789,
          },
          "error_type": "pcb_trace_error",
          "message": "PCB trace trace[source_trace_1_0] overlaps with trace[source_trace_0_0] (gap: 0.016mm)",
          "pcb_component_ids": [],
          "pcb_port_ids": [],
          "pcb_trace_error_id": "overlap_source_trace_1_0_source_trace_0_0",
          "pcb_trace_id": "source_trace_1_0",
          "source_trace_id": "",
          "type": "pcb_trace_error",
        },
      ]
    `)
    expect(errors.length).toBeGreaterThan(0)
    const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
      shouldDrawErrors: true,
    })
    await expect(svg).toMatchSvgSnapshot(import.meta.path)
  })
})
