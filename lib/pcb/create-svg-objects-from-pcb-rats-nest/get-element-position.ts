import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"

interface Position {
  x: number
  y: number
}

export const getElementPosition = (
  id: string,
  circuitJson: AnyCircuitElement[],
  layerFilter?: LayerRef,
): Position | null => {
  // Try to find the element as a pcb_smtpad
  const pcbSmtpad = su(circuitJson).pcb_smtpad.get(id)
  if (pcbSmtpad && "x" in pcbSmtpad && "y" in pcbSmtpad) {
    if (layerFilter && pcbSmtpad.layer !== layerFilter) return null
    return { x: pcbSmtpad.x, y: pcbSmtpad.y }
  }

  // Try to find the element as a pcb_plated_hole
  const pcbPlatedHole = su(circuitJson).pcb_plated_hole.get(id)
  if (pcbPlatedHole && "x" in pcbPlatedHole && "y" in pcbPlatedHole) {
    if (
      layerFilter &&
      Array.isArray(pcbPlatedHole.layers) &&
      pcbPlatedHole.layers.length > 0 &&
      !pcbPlatedHole.layers.includes(layerFilter)
    ) {
      return null
    }
    return { x: pcbPlatedHole.x, y: pcbPlatedHole.y }
  }

  // Try to find the element as a pcb_port
  const pcbPort = su(circuitJson).pcb_port.get(id)
  if (
    pcbPort &&
    typeof pcbPort.x === "number" &&
    typeof pcbPort.y === "number"
  ) {
    if (
      layerFilter &&
      Array.isArray(pcbPort.layers) &&
      pcbPort.layers.length > 0 &&
      !pcbPort.layers.includes(layerFilter)
    ) {
      return null
    }
    return { x: pcbPort.x, y: pcbPort.y }
  }

  // If none is found, return null
  return null
}
