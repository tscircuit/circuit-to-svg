import type { AnyCircuitElement } from "circuit-json"

const hasStringProp = <T extends string>(
  elm: AnyCircuitElement,
  prop: T,
): elm is AnyCircuitElement & Record<T, string> =>
  prop in elm && typeof (elm as Record<T, unknown>)[prop] === "string"

export const getBoardId = (elm: AnyCircuitElement): string => {
  if (hasStringProp(elm, "pcb_board_id")) return elm.pcb_board_id
  if (hasStringProp(elm, "board_id")) return elm.board_id
  return "pcb_board"
}

export const getPanelId = (elm: AnyCircuitElement): string => {
  if (hasStringProp(elm, "pcb_panel_id")) return elm.pcb_panel_id
  if (hasStringProp(elm, "panel_id")) return elm.panel_id
  return "panel"
}
