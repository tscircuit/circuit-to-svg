import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("REPRO: panel bounds vs board bounds - texture should cover full panel", () => {
  // Example scenario from issue:
  // Panel bounds: x: 0-100, y: 0-100
  // Board 1 bounds: x: 10-40, y: 10-40
  // Board 2 bounds: x: 60-90, y: 60-90
  const circuitJson = [
    {
      type: "pcb_panel" as const,
      pcb_panel_id: "pcb_panel_0",
      width: 100,
      height: 100,
      center: { x: 50, y: 50 },
      covered_with_solder_mask: false,
    },
    // Board 1 - bounds x: 10-40, y: 10-40 (center at 25, 25, size 30x30)
    {
      type: "pcb_board" as const,
      pcb_board_id: "pcb_board_0",
      center: { x: 25, y: 25 },
      width: 30,
      height: 30,
      material: "fr4" as const,
      num_layers: 2,
      thickness: 1.6,
    },
    // Board 2 - bounds x: 60-90, y: 60-90 (center at 75, 75, size 30x30)
    {
      type: "pcb_board" as const,
      pcb_board_id: "pcb_board_1",
      center: { x: 75, y: 75 },
      width: 30,
      height: 30,
      material: "fr4" as const,
      num_layers: 2,
      thickness: 1.6,
    },
  ] as any

  const svgString = convertCircuitJsonToPcbSvg(circuitJson, {
    width: 800,
    height: 600,
    drawPaddingOutsideBoard: true,
  })

  // Verify SVG renders successfully
  expect(svgString).toContain("svg")
  expect(svgString).toContain("pcb-boundary")
})
