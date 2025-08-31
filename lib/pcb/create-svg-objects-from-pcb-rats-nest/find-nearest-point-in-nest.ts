import type { AnyCircuitElement } from "circuit-json"
import type { ConnectivityMap } from "circuit-json-to-connectivity-map"
import { getElementPosition } from "./get-element-position"

export const findNearestPointInNet = (
  sourcePoint: { x: number; y: number },
  netId: string,
  connectivity: ConnectivityMap,
  circuitJson: AnyCircuitElement[],
): { x: number; y: number } | null => {
  const connectedIds = connectivity.getIdsConnectedToNet(netId)
  let nearestPoint: { x: number; y: number } | null = null
  let minDistance = Number.POSITIVE_INFINITY

  for (const id of connectedIds) {
    const pos = getElementPosition(id, circuitJson)
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
