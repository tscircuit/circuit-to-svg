import { expect, test } from "bun:test"
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

test("backgroundColor option", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, { backgroundColor: "#fff" })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
