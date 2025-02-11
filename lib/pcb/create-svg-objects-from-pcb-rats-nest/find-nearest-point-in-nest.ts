import type { AnyCircuitElement } from "circuit-json"
import { getElementPosition } from "./get-element-position"
import { ConnectivityMap } from "circuit-json-to-connectivity-map"

export const findNearestPointInNet = (
  sourcePoint: { x: number; y: number },
  netId: string,
  connectivity: ConnectivityMap,
  soup: AnyCircuitElement[],
): { x: number; y: number } | null => {
  const connectedIds = connectivity.getIdsConnectedToNet(netId)
  let nearestPoint: { x: number; y: number } | null = null
  let minDistance = Infinity

  for (const id of connectedIds) {
    const pos = getElementPosition(id, soup)
    if (pos) {
      const dx = sourcePoint.x - pos.x
      const dy = sourcePoint.y - pos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance > 0 && distance < minDistance) {
        minDistance = distance
        nearestPoint = pos
      }
    }
  }

  return nearestPoint
}
