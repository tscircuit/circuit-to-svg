import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement, PCBTrace, PcbSmtPad } from "circuit-json"

test("trace soldermask is removed over uncovered pad", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 30,
      height: 30,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_uncovered",
      shape: "rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 8,
      height: 6,
      is_covered_with_solder_mask: false,
    } as PcbSmtPad,
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_cross_pad",
      route: [
        { x: -10, y: 0, layer: "top", width: 1 },
        { x: 10, y: 0, layer: "top", width: 1 },
      ],
    } as PCBTrace,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, { showSolderMask: true })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
