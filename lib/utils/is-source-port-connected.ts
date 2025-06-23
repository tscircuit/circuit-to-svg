import type { AnyCircuitElement } from "circuit-json"

export const isSourcePortConnected = (
  circuitJson: AnyCircuitElement[],
  sourcePortId: string,
): boolean => {
  for (const elm of circuitJson) {
    if (elm.type !== "source_trace") continue
    const trace = elm as any
    if (
      Array.isArray(trace.connected_source_port_ids) &&
      trace.connected_source_port_ids.includes(sourcePortId)
    ) {
      return true
    }
  }
  return false
}
