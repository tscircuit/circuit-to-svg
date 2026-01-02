import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("uses panel bounds by default when a panel exists", () => {
  const circuitJson = [
    {
      type: "pcb_panel" as const,
      pcb_panel_id: "panel_0",
      width: 100,
      height: 80,
      center: { x: 50, y: 40 },
    },
    {
      type: "pcb_board" as const,
      pcb_board_id: "board_a",
      center: { x: 25, y: 25 },
      width: 30,
      height: 30,
      material: "fr4" as const,
      num_layers: 2,
      thickness: 1.6,
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    width: 400,
    height: 300,
    drawPaddingOutsideBoard: true,
  })

  expect(svg).toContain("svg")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("renders to targeted board bounds when viewportTarget.board is provided", () => {
  const circuitJson = [
    {
      type: "pcb_panel" as const,
      pcb_panel_id: "panel_0",
      width: 200,
      height: 150,
      center: { x: 100, y: 75 },
    },
    {
      type: "pcb_board" as const,
      pcb_board_id: "board_a",
      center: { x: 40, y: 40 },
      width: 30,
      height: 30,
      material: "fr4" as const,
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_board" as const,
      pcb_board_id: "board_b",
      center: { x: 140, y: 40 },
      width: 30,
      height: 30,
      material: "fr4" as const,
      num_layers: 2,
      thickness: 1.6,
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    width: 400,
    height: 300,
    drawPaddingOutsideBoard: true,
    viewportTarget: { pcb_board_id: "board_b" },
  })

  expect(svg).toContain("svg")
  expect(svg).toMatchSvgSnapshot(`${import.meta.path}-board-target`)
})
