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
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad-offboard",
    shape: "rect",
    width: 1,
    height: 1,
    x: 7,
    y: 0,
  },
]

test("offboard element does not affect bounds", async () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    drawPaddingOutsideBoard: false,
  })
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
}, 10000)
