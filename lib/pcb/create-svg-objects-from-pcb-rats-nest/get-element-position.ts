import type { AnyCircuitElement } from "circuit-json"

export const getElementPosition = (
  id: string,
  elementMap: Map<string, AnyCircuitElement>,
): { x: number; y: number } | null => {
  const elm = elementMap.get(id)
  if (elm && "x" in elm && "y" in elm) {
    return { x: (elm as any).x, y: (elm as any).y }
  }
  return null
}
