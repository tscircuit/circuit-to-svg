import type { AnyCircuitElement } from "circuit-json"

export const getElementPosition = (
  id: string,
  circuitJson: AnyCircuitElement[],
): { x: number; y: number } | null => {
  const elm = circuitJson.find((element) => {
    const elmId =
      (element as any).id ||
      (element as any).pcb_port_id ||
      (element as any).source_port_id
    return elmId === id
  })

  if (elm && "x" in elm && "y" in elm) {
    return { x: (elm as any).x, y: (elm as any).y }
  }
  return null
}
