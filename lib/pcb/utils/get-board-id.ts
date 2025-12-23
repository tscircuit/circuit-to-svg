import type { AnyCircuitElement } from "circuit-json"
import { hasStringProp } from "./has-string-prop"

export const getBoardId = (elm: AnyCircuitElement): string => {
  if (hasStringProp(elm, "pcb_board_id")) return elm.pcb_board_id
  return "pcb_board"
}
