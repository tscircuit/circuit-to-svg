import type { AnyCircuitElement } from "circuit-json"
import { hasStringProp } from "./has-string-prop"

export const getPanelId = (elm: AnyCircuitElement): string => {
  if (hasStringProp(elm, "pcb_panel_id")) return elm.pcb_panel_id
  return "panel"
}
