import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  },
]

test("drawPaddingOutsideBoard false", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    drawPaddingOutsideBoard: false,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
