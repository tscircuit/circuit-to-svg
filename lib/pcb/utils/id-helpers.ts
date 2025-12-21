import type { AnyCircuitElement } from "circuit-json"

export const getBoardId = (elm: AnyCircuitElement): string => {
  if ("pcb_board_id" in elm && typeof elm.pcb_board_id === "string") {
    return elm.pcb_board_id
  }
  if ("board_id" in elm && typeof (elm as any).board_id === "string") {
    return (elm as any).board_id
  }
  return "pcb_board"
}

export const getPanelId = (elm: AnyCircuitElement): string => {
  if ("pcb_panel_id" in elm && typeof elm.pcb_panel_id === "string") {
    return elm.pcb_panel_id
  }
  if ("panel_id" in elm && typeof (elm as any).panel_id === "string") {
    return (elm as any).panel_id
  }
  return "panel"
}
