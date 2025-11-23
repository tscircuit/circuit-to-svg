import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"

test("pcb copper pours with solder mask", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 50,
      height: 50,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // Rectangular pour with solder mask
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour1",
      layer: "top",
      center: { x: -12, y: 12 },
      width: 10,
      height: 10,
      covered_with_solder_mask: true,
    } as PcbCopperPour,
    // Rectangular pour without solder mask
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour2",
      layer: "top",
      center: { x: 12, y: 12 },
      width: 10,
      height: 10,
      covered_with_solder_mask: false,
    } as PcbCopperPour,
  ]
  const result = convertCircuitJsonToPcbSvg(circuitJson, {
    showSolderMask: true,
  })
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
