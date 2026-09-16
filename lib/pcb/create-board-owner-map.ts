import type { AnyCircuitElement, PcbBoard } from "circuit-json"

export function createBoardOwnerMap(circuitJson: AnyCircuitElement[]) {
  const boardOwnerMap = new Map<string, PcbBoard | undefined>()
  const parentById = new Map<string, string | undefined>()
  const boards = circuitJson.filter(
    (element): element is PcbBoard => element.type === "pcb_board",
  )

  for (const element of circuitJson) {
    const id = Object.entries(element).find(
      ([key]) => key === `${element.type}_id`,
    )?.[1]
    if (typeof id !== "string") continue

    const parentId = [
      "subcircuit_id" in element && element.subcircuit_id,
      "pcb_group_id" in element && element.pcb_group_id,
      "pcb_component_id" in element && element.pcb_component_id,
      "pcb_trace_id" in element && element.pcb_trace_id,
      "source_group_id" in element && element.source_group_id,
      "parent_source_group_id" in element && element.parent_source_group_id,
      "parent_subcircuit_id" in element && element.parent_subcircuit_id,
    ].find((parentId) => parentId && parentId !== id)
    parentById.set(id, parentId || undefined)

    if (
      element.type === "source_group" &&
      element.is_subcircuit &&
      element.subcircuit_id
    ) {
      parentById.set(
        element.subcircuit_id,
        element.parent_subcircuit_id ?? element.parent_source_group_id,
      )
    }
  }

  for (const board of boards) {
    boardOwnerMap.set(board.pcb_board_id, board)
    if (board.subcircuit_id) boardOwnerMap.set(board.subcircuit_id, board)
  }

  const resolving = new Set<string>()
  function resolveBoard(id: string): PcbBoard | undefined {
    if (boardOwnerMap.has(id)) return boardOwnerMap.get(id)
    if (resolving.has(id) || !parentById.has(id)) return undefined
    resolving.add(id)
    const parentId = parentById.get(id)
    const board = parentId
      ? resolveBoard(parentId)
      : boards.length === 1
        ? boards[0]
        : undefined
    boardOwnerMap.set(id, board)
    resolving.delete(id)
    return board
  }

  for (const id of parentById.keys()) resolveBoard(id)
  return boardOwnerMap
}
