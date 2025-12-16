import type { AnyCircuitElement } from "circuit-json"

const getStringProp = (obj: unknown, key: string): string | undefined => {
  if (obj && typeof obj === "object" && key in obj) {
    const val = (obj as Record<string, unknown>)[key]
    return typeof val === "string" ? val : undefined
  }
  return undefined
}

export const getBoardId = (elm: AnyCircuitElement): string =>
  getStringProp(elm, "pcb_board_id") ??
  getStringProp(elm, "board_id") ??
  "pcb_board"

export const getPanelId = (elm: AnyCircuitElement): string =>
  getStringProp(elm, "pcb_panel_id") ??
  getStringProp(elm, "panel_id") ??
  "panel"
