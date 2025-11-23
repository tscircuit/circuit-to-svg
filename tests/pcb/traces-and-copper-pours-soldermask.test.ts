import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement, PCBTrace, PcbCopperPour } from "circuit-json"

test("PCB traces work correctly with copper pours and soldermask", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 50,
      height: 40,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // Covered copper pour
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour_covered",
      layer: "top",
      center: { x: -15, y: 10 },
      width: 12,
      height: 8,
      covered_with_solder_mask: true,
    } as PcbCopperPour,
    // Uncovered copper pour
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour_uncovered",
      layer: "top",
      center: { x: 15, y: 10 },
      width: 12,
      height: 8,
      covered_with_solder_mask: false,
    } as PcbCopperPour,
    // Trace connecting the pours
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_connecting",
      route: [
        { x: -9, y: 10, layer: "top", width: 1.0 },
        { x: 0, y: 10, layer: "top", width: 1.0 },
        { x: 9, y: 10, layer: "top", width: 1.0 },
      ],
    } as PCBTrace,
    // Trace going through uncovered area
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_uncovered",
      route: [
        { x: 15, y: 6, layer: "top", width: 1.5 },
        { x: 15, y: 14, layer: "top", width: 1.5 },
      ],
    } as PCBTrace,
    // Trace crossing the board
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_cross",
      route: [
        { x: -20, y: -10, layer: "top", width: 1.0 },
        { x: 0, y: -10, layer: "top", width: 1.0 },
        { x: 20, y: -10, layer: "top", width: 1.0 },
      ],
    } as PCBTrace,
  ]

  const result = convertCircuitJsonToPcbSvg(circuitJson, {
    showSolderMask: true,
  })
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
