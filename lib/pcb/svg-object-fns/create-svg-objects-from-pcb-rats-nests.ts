import {
  ConnectivityMap,
  getFullConnectivityMapFromCircuitJson,
} from "circuit-json-to-connectivity-map"
import type { AnyCircuitElement } from "circuit-json"
import { type INode as SvgObject } from "svgson"
import { type Matrix, applyToPoint } from "transformation-matrix"
import { findNearestPointInNet } from "../create-svg-objects-from-pcb-rats-nest/find-nearest-point-in-nest"
import { su } from "@tscircuit/circuit-json-util"

interface RatsNestLine {
  key: string
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  isInNet: boolean
}

export function createSvgObjectsForRatsNest(
  circuitJson: AnyCircuitElement[],
  transform: Matrix,
): SvgObject[] {
  // Compute connectivity using the helper from the imported package.
  const connectivity: ConnectivityMap =
    getFullConnectivityMapFromCircuitJson(circuitJson)

  // Filter for ports and traces that are relevant for rats nest.
  const pcbPorts = circuitJson.filter((elm) => elm.type === "pcb_port")
  const sourceTraces = circuitJson.filter((elm) => elm.type === "source_trace")

  const ratsNestLines: RatsNestLine[] = []

  pcbPorts.forEach((port, index) => {
    const portId = (port as any).pcb_port_id
    if (!portId) return

    const netId = connectivity.getNetConnectedToId(portId)
    if (!netId) return

    // Determine whether the port is in net via a connected source trace.
    let isInNet = false
    const sourcePort = su(circuitJson).source_port.getWhere({
      pcb_port_id: portId,
    })
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

    // Find the nearest point in the net using ConnectivityMap
    const nearestPoint = findNearestPointInNet(
      startPoint,
      netId,
      connectivity,
      circuitJson,
    )

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
      "stroke-dasharray": "6,6",
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
