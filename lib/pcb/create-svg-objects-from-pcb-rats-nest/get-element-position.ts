import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/soup-util"

export const getElementPosition = (
  id: string,
  circuitJson: AnyCircuitElement[],
): { x: number; y: number } | null => {
  // Try to find the element as a pcb_smtpad
  const pcbSmtpad = su(circuitJson).pcb_smtpad.get(id)
  if (pcbSmtpad && "x" in pcbSmtpad && "y" in pcbSmtpad) {
    return { x: (pcbSmtpad as any).x, y: (pcbSmtpad as any).y }
  }

  // Try to find the element as a pcb_plated_hole
  const pcbPlatedHole = su(circuitJson).pcb_plated_hole.get(id)
  if (pcbPlatedHole && "x" in pcbPlatedHole && "y" in pcbPlatedHole) {
    return { x: (pcbPlatedHole as any).x, y: (pcbPlatedHole as any).y }
  }

  // If neither is found, return null
  return null
}
