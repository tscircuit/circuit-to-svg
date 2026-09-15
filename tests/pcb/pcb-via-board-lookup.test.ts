import { expect, test } from "bun:test"
import type { PcbBoard, SourceGroup } from "circuit-json"
import { getPcbBoardForVia } from "lib/pcb/get-pcb-board-for-via"
import { getViaTentingPanel } from "./pcb-via-board-tenting.fixture"

test("via board lookup follows ownership and only uses unambiguous geometry as fallback", () => {
  const elements = getViaTentingPanel("top")
  const boardA = elements.find(
    (element): element is PcbBoard =>
      element.type === "pcb_board" && element.pcb_board_id === "board_A",
  )!
  const boardB = elements.find(
    (element): element is PcbBoard =>
      element.type === "pcb_board" && element.pcb_board_id === "board_B",
  )!
  const positionOnB = { x: 18, y: 5 }
  expect(
    getPcbBoardForVia(
      { ...positionOnB, pcb_group_id: "group_B", pcb_trace_id: "trace_A" },
      elements,
    ),
  ).toBe(boardB)

  expect(
    getPcbBoardForVia({ ...positionOnB, subcircuit_id: "child_A" }, elements),
  ).toBe(boardA)
  expect(
    getPcbBoardForVia({ ...positionOnB, pcb_group_id: "group_A" }, elements),
  ).toBe(boardA)
  expect(
    getPcbBoardForVia({ ...positionOnB, pcb_trace_id: "trace_A" }, elements),
  ).toBe(boardA)
  expect(getPcbBoardForVia(positionOnB, [boardA, boardB])).toBe(boardB)
  expect(getPcbBoardForVia(positionOnB, [boardB, boardA])).toBe(boardB)
  expect(getPcbBoardForVia({ x: 0, y: 0 }, [boardA, boardB])).toBeUndefined()
  expect(
    getPcbBoardForVia(positionOnB, [
      boardB,
      { ...boardA, center: boardB.center },
    ]),
  ).toBeUndefined()
  expect(getPcbBoardForVia(positionOnB, [])).toBeUndefined()
  expect(getPcbBoardForVia(positionOnB, [boardB])).toBe(boardB)

  const polygon: PcbBoard = {
    ...boardA,
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    outline: [
      { x: -10, y: -10 },
      { x: 10, y: -10 },
      { x: -10, y: 10 },
    ],
  }
  expect(getPcbBoardForVia({ x: -5, y: -5 }, [polygon, boardB])).toBe(polygon)
  expect(getPcbBoardForVia({ x: 0, y: 8 }, [polygon, boardB])).toBeUndefined()

  const cycle: SourceGroup = {
    type: "source_group",
    source_group_id: "cycle",
    subcircuit_id: "cycle",
    parent_subcircuit_id: "cycle",
    is_subcircuit: true,
  }
  expect(
    getPcbBoardForVia({ x: 0, y: 0, subcircuit_id: "cycle" }, [
      boardA,
      boardB,
      cycle,
    ]),
  ).toBeUndefined()
})
