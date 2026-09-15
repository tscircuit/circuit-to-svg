import type {
  AnyCircuitElement,
  PcbBoard,
  PcbVia,
  PcbTrace,
  PcbGroup,
  SourceGroup,
  Point,
} from "circuit-json"

export function getPcbBoardForVia(
  via: Pick<
    PcbVia,
    "x" | "y" | "subcircuit_id" | "pcb_group_id" | "pcb_trace_id"
  >,
  elements: AnyCircuitElement[] = [],
): PcbBoard | undefined {
  const boards = elements.filter(
    (element): element is PcbBoard => element.type === "pcb_board",
  )
  const trace = via.pcb_trace_id
    ? elements.find(
        (element): element is PcbTrace =>
          element.type === "pcb_trace" &&
          element.pcb_trace_id === via.pcb_trace_id,
      )
    : undefined
  const groupId = via.pcb_group_id ?? trace?.pcb_group_id
  const group = groupId
    ? elements.find(
        (element): element is PcbGroup =>
          element.type === "pcb_group" && element.pcb_group_id === groupId,
      )
    : undefined
  let subcircuitId =
    via.subcircuit_id ?? group?.subcircuit_id ?? trace?.subcircuit_id
  if (boards.length === 1 && (!subcircuitId || !boards[0]?.subcircuit_id)) {
    return boards[0]
  }

  const visited = new Set<string>()
  while (subcircuitId && !visited.has(subcircuitId)) {
    const board = boards.find((board) => board.subcircuit_id === subcircuitId)
    if (board) return board
    visited.add(subcircuitId)
    const parent = elements.find(
      (element): element is SourceGroup =>
        element.type === "source_group" &&
        element.is_subcircuit === true &&
        element.subcircuit_id === subcircuitId,
    )
    subcircuitId = parent?.parent_subcircuit_id
  }

  const containingBoards = boards.filter((board) => {
    if (board.outline?.length) return isPointInsideOutline(via, board.outline)
    return (
      board.width !== undefined &&
      board.height !== undefined &&
      Math.abs(via.x - board.center.x) <= board.width / 2 &&
      Math.abs(via.y - board.center.y) <= board.height / 2
    )
  })
  return containingBoards.length === 1 ? containingBoards[0] : undefined
}

function isPointInsideOutline(point: Point, outline: Point[]): boolean {
  let inside = false
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i]!
    const b = outline[j]!
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside
    }
  }
  return inside
}
