import { expect, test, describe } from "bun:test"
import circuitJsonFixture from "../assets/traces-too-close.json"
import { convertCircuitJsonToPcbSvg } from "lib/index"
import { checkEachPcbTraceNonOverlapping } from "@tscircuit/checks"

describe("PCB traces in non-overlapping trace checks", () => {
  test("Should draw error as two traces are too close", async () => {
    const circuitJson = structuredClone(circuitJsonFixture)
    const errors = checkEachPcbTraceNonOverlapping(circuitJson as any)

    expect(errors).toMatchInlineSnapshot(`
      [
        {
          "center": {
            "x": -0.6877720255648351,
            "y": -0.07159251656145789,
          },
          "error_type": "pcb_trace_error",
          "message": "PCB trace .R1 > .pin1 to .C1 > .pin1 is too close to .R1 > .pin2 to .C1 > .pin2 (gap: 0.016mm)",
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
    const svg = convertCircuitJsonToPcbSvg([...circuitJson, ...errors] as any, {
      shouldDrawErrors: true,
    })
    await expect(svg).toMatchSvgSnapshot(import.meta.path)
  })
})
