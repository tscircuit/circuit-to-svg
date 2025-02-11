import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import type { AnyCircuitElement } from "circuit-json"
import { type INode as SvgObject } from "svgson"
import { type Matrix, applyToPoint } from "transformation-matrix"
import { su } from "@tscircuit/soup-util"

interface RatsNestLine {
  key: string
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  isInNet: boolean
}

export function createSvgObjectsForRatsNest(
  soup: AnyCircuitElement[],
  transform: Matrix,
): SvgObject[] {
  const connectivityMap = getFullConnectivityMapFromCircuitJson(soup)

  const elementMap = new Map<string, AnyCircuitElement>()
  for (const elm of soup) {
    const id =
      (elm as any).id || (elm as any).pcb_port_id || (elm as any).source_port_id

    if (id) {
      const cleanedId = id.replace(/_\d+$/, "")
      elementMap.set(cleanedId, elm)
    }
  }
  const getElementPosition = (id: string): { x: number; y: number } | null => {
    const cleanedId = id.replace(/_\d+$/, "")
    const elm = elementMap.get(cleanedId)
    if (elm && "x" in elm && "y" in elm) {
      return { x: (elm as any).x, y: (elm as any).y }
    }
    return null
  }

  // Compute connectivity using the helper from the imported package.
  let netMap: { [netId: string]: string[] } = {}
  let idToNetMap: { [id: string]: string } = {}
  try {
    const connectivity = getFullConnectivityMapFromCircuitJson(soup)
    netMap = connectivity.netMap
    idToNetMap = connectivity.idToNetMap
  } catch (error) {
    console.error("Error computing connectivity map for rats nest:", error)
    return []
  }

  // Filter for ports and traces that are relevant for rats nest.
  const pcbPorts = soup.filter((elm) => elm.type === "pcb_port")
  const sourceTraces = soup.filter((elm) => elm.type === "source_trace")

  const getSourcePortForPcbPort = (pcbPortId: string) => {
    return su(soup).source_port.getWhere({ pcb_port_id: pcbPortId })
  }

  // Helper: for a given point and net, find the nearest other point (if any) in that net.
  const findNearestPointInNet = (
    sourcePoint: { x: number; y: number },
    netId: string,
  ): { x: number; y: number } | null => {
    const connectedIds: string[] = netMap[netId] || []
    let nearestPoint: { x: number; y: number } | null = null
    let minDistance = Infinity
    for (const id of connectedIds) {
      const pos = getElementPosition(id)
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

  const ratsNestLines: RatsNestLine[] = []
  pcbPorts.forEach((port, index) => {
    const portId = (port as any).pcb_port_id
    if (!portId) return
    const netId = idToNetMap[portId]
    if (!netId) return

    // Determine whether the port is in net via a connected source trace.
    let isInNet = false
    const sourcePort = getSourcePortForPcbPort(portId)
    if (sourcePort && (sourcePort as any).source_port_id) {
      const sourcePortId = (sourcePort as any).source_port_id
      for (const trace of sourceTraces) {
        if (
          Array.isArray((trace as any).connected_source_port_ids) &&
          (trace as any).connected_source_port_ids.includes(sourcePortId) &&
          Array.isArray((trace as any).connected_source_net_ids) &&
          (trace as any).connected_source_net_ids.length > 0
        ) {
          isInNet = true
          break
        }
      }
    }

    const startPoint = { x: (port as any).x, y: (port as any).y }
    const nearestPoint = findNearestPointInNet(startPoint, netId)
    if (!nearestPoint) return

    ratsNestLines.push({
      key: `${portId}-${index}`,
      startPoint,
      endPoint: nearestPoint,
      isInNet,
    })
  })

  // Create SVG <line> objects for each rats nest connection.
  const svgObjects: SvgObject[] = []
  for (const line of ratsNestLines) {
    const transformedStart = applyToPoint(transform, [
      line.startPoint.x,
      line.startPoint.y,
    ])
    const transformedEnd = applyToPoint(transform, [
      line.endPoint.x,
      line.endPoint.y,
    ])
    const attributes: { [key: string]: string } = {
      x1: transformedStart[0].toString(),
      y1: transformedStart[1].toString(),
      x2: transformedEnd[0].toString(),
      y2: transformedEnd[1].toString(),
      stroke: "white",
      "stroke-width": "1",
    }
    if (line.isInNet) {
      attributes["stroke-dasharray"] = "6,6"
    }
    svgObjects.push({
      name: "line",
      type: "element",
      attributes,
      value: "",
      children: [],
    })
  }
  return svgObjects
}
