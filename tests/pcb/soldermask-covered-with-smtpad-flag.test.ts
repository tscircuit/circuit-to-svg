import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("smtpad uses covered_with_solder_mask when showSolderMask is enabled", () => {
  const circuit: any = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 8,
      height: 4,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_covered",
      shape: "rect",
      layer: "top",
      x: -1.5,
      y: 0,
      width: 1.2,
      height: 1,
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_uncovered",
      shape: "rect",
      layer: "top",
      x: 1.5,
      y: 0,
      width: 1.2,
      height: 1,
      covered_with_solder_mask: false,
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
