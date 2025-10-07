import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const board = {
  type: "pcb_board" as const,
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 10,
  height: 10,
}

test("top copper pour renders above bottom copper pour", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_top",
      layer: "top",
      shape: "rect",
      center: { x: 0, y: 0 },
      width: 6,
      height: 6,
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_bottom",
      layer: "bottom",
      shape: "rect",
      center: { x: 0, y: 0 },
      width: 6,
      height: 6,
    },
  ] as any)

  const topIndex = svg.indexOf('data-layer="top"')
  const bottomIndex = svg.indexOf('data-layer="bottom"')

  expect(topIndex).toBeGreaterThan(-1)
  expect(bottomIndex).toBeGreaterThan(-1)
  expect(bottomIndex).toBeLessThan(topIndex)
})
