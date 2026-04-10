import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement, PCBTrace, PcbCopperPour } from "circuit-json"

test("hidePours hides copper pours without hiding other copper output", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board-hide-pours",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour-hidden",
      layer: "top",
      center: { x: -5, y: 0 },
      width: 8,
      height: 6,
      covered_with_solder_mask: true,
    } as PcbCopperPour,
    {
      type: "pcb_trace",
      pcb_trace_id: "trace-still-visible",
      route: [
        { x: 2, y: -4, layer: "top", width: 0.6 },
        { x: 8, y: -4, layer: "top", width: 0.6 },
      ],
    } as PCBTrace,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    hidePours: true,
    showSolderMask: true,
  })

  expect(svg).not.toContain('data-type="pcb_copper_pour"')
  expect(svg).not.toContain("pcb-soldermask-covered-pour")
  expect(svg).toContain('data-type="pcb_trace_soldermask"')
})
