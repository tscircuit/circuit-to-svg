import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement, PCBTrace } from "circuit-json"

test("PCB traces work correctly with soldermask", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 40,
      height: 30,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // Simple horizontal trace
    {
      type: "pcb_trace",
      pcb_trace_id: "trace1",
      route: [
        { x: -15, y: 0, layer: "top", width: 1.0 },
        { x: -5, y: 0, layer: "top", width: 1.0 },
      ],
    } as PCBTrace,
    // Vertical trace
    {
      type: "pcb_trace",
      pcb_trace_id: "trace2",
      route: [
        { x: 0, y: -10, layer: "top", width: 1.0 },
        { x: 0, y: 10, layer: "top", width: 1.0 },
      ],
    } as PCBTrace,
    // Diagonal trace
    {
      type: "pcb_trace",
      pcb_trace_id: "trace3",
      route: [
        { x: 5, y: -10, layer: "top", width: 1.5 },
        { x: 15, y: 0, layer: "top", width: 1.5 },
        { x: 15, y: 10, layer: "top", width: 1.5 },
      ],
    } as PCBTrace,
  ]

  const result = convertCircuitJsonToPcbSvg(circuitJson, {
    showSolderMask: true,
  })
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
