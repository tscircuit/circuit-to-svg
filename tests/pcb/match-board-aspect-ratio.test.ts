import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 40,
    height: 20,
  },
]

test("matchBoardAspectRatio option", () => {
  const defaultSvg = convertCircuitJsonToPcbSvg(circuit)
  const matchedSvg = convertCircuitJsonToPcbSvg(circuit, {
    matchBoardAspectRatio: true,
  })

  expect(defaultSvg).toMatchSvgSnapshot(import.meta.path, "default")
  expect(matchedSvg).toMatchSvgSnapshot(import.meta.path, "matched")
})
