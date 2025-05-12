import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"

interface Position {
  x: number
  y: number
}

export const getElementPosition = (
  id: string,
  circuitJson: AnyCircuitElement[],
): Position | null => {
  // Try to find the element as a pcb_smtpad
  const pcbSmtpad = su(circuitJson).pcb_smtpad.get(id)
  if (pcbSmtpad && "x" in pcbSmtpad && "y" in pcbSmtpad) {
    return { x: pcbSmtpad.x, y: pcbSmtpad.y }
  }

  // Try to find the element as a pcb_plated_hole
  const pcbPlatedHole = su(circuitJson).pcb_plated_hole.get(id)
  if (pcbPlatedHole && "x" in pcbPlatedHole && "y" in pcbPlatedHole) {
    return { x: pcbPlatedHole.x, y: pcbPlatedHole.y }
  }

  // If neither is found, return null
  return null
}
