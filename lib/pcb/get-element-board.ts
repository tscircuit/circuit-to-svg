import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import type { PcbContext } from "./convert-circuit-json-to-pcb-svg"

export function getElementBoard(
  elm: AnyCircuitElement,
  ctx: PcbContext,
): PcbBoard | undefined {
  if (elm.type === "pcb_board") return elm
  if ("pcb_board_id" in elm && elm.pcb_board_id) {
    return ctx.boardOwnerMap?.get(elm.pcb_board_id)
  }
  if ("subcircuit_id" in elm && elm.subcircuit_id) {
    return ctx.boardOwnerMap?.get(elm.subcircuit_id)
  }
  if ("pcb_component_id" in elm && elm.pcb_component_id) {
    return ctx.boardOwnerMap?.get(elm.pcb_component_id)
  }
  if ("pcb_group_id" in elm && elm.pcb_group_id) {
    return ctx.boardOwnerMap?.get(elm.pcb_group_id)
  }
  return undefined
}
