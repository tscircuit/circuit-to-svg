import { expect, test, describe } from "bun:test"
import circuitJsonFixture from "../assets/via-too-close-to-trace.json"
import { convertCircuitJsonToPcbSvg } from "lib/index"
import { checkViaTraceClearance } from "@tscircuit/checks"

describe("PCB vias in non-overlapping trace checks", () => {
  test("via clearance checks should detect traces too close to vias", async () => {
    const circuitJson = structuredClone(circuitJsonFixture)
    const errors = checkViaTraceClearance(circuitJson as any)

    expect(errors).toMatchInlineSnapshot(`
      [
        {
          "actual_clearance": 0.0859484136946458,
          "center": {
            "x": 1.9,
            "y": -0.2570257931526771,
          },
          "error_type": "pcb_via_trace_clearance_error",
          "message": "Via pcb_via[#pcb_via_0] and trace trace[source_trace_0_0] are too close (clearance: 0.086mm, minimum: 0.1mm)",
          "minimum_clearance": 0.1,
          "pcb_trace_id": "source_trace_0_0",
          "pcb_via_id": "pcb_via_0",
          "pcb_via_trace_clearance_error_id": "via_trace_clearance_pcb_via_0_source_trace_0_0",
          "type": "pcb_via_trace_clearance_error",
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
