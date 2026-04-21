import type { AnyCircuitElement } from "circuit-json"

/**
 * Groups source_trace elements into nets via Union-Find on their
 * connected_source_port_ids / connected_source_net_ids, then maps
 * each schematic_trace_id to a net connectivity key.
 *
 * Used as a fallback when schematic_traces lack subcircuit_connectivity_map_key
 * (top-level circuits are never wrapped in a subcircuit, so the key is never
 * set by the router).
 */
export function computeNetGroupsFromSourceTraces(
  circuitJson: AnyCircuitElement[],
): Map<string, string> {
  // --- Union-Find over source port / net IDs ---
  const parent = new Map<string, string>()

  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x)
    const p = parent.get(x)!
    if (p === x) return x
    const root = find(p)
    parent.set(x, root)
    return root
  }

  const union = (a: string, b: string): void => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  const sourceTraces = circuitJson.filter((e) => e.type === "source_trace")

  for (const trace of sourceTraces) {
    const ids = [
      ...trace.connected_source_port_ids,
      ...trace.connected_source_net_ids,
    ]
    for (let i = 1; i < ids.length; i++) union(ids[0]!, ids[i]!)
  }

  // Prefer the existing subcircuit_connectivity_map_key when one is present;
  // otherwise synthesise a stable key from the Union-Find root.
  const rootKey = new Map<string, string>()
  for (const trace of sourceTraces) {
    const ids = [
      ...trace.connected_source_port_ids,
      ...trace.connected_source_net_ids,
    ]
    if (ids.length === 0) continue
    const root = find(ids[0]!)
    const existingKey = trace.subcircuit_connectivity_map_key
    if (!rootKey.has(root)) {
      rootKey.set(root, existingKey ?? `net_group_${root}`)
    } else if (existingKey && rootKey.get(root)!.startsWith("net_group_")) {
      rootKey.set(root, existingKey)
    }
  }

  // Map each source_port_id to its net key
  const portKey = new Map<string, string>()
  for (const trace of sourceTraces) {
    const ids = [
      ...trace.connected_source_port_ids,
      ...trace.connected_source_net_ids,
    ]
    if (ids.length === 0) continue
    const key = rootKey.get(find(ids[0]!))!
    for (const id of ids) portKey.set(id, key)
  }

  // Schematic traces don't carry source_port_ids directly. Match them to
  // source ports via schematic_port.center coordinates (rounded to 4 dp).
  const pointToSourcePort = new Map<string, string>()
  for (const elm of circuitJson) {
    if (elm.type !== "schematic_port") continue
    const k = `${Math.round(elm.center.x * 1e4)}_${Math.round(elm.center.y * 1e4)}`
    pointToSourcePort.set(k, elm.source_port_id)
  }

  const result = new Map<string, string>()
  for (const elm of circuitJson) {
    if (elm.type !== "schematic_trace" || elm.subcircuit_connectivity_map_key)
      continue
    for (const edge of elm.edges) {
      const fk = `${Math.round(edge.from.x * 1e4)}_${Math.round(edge.from.y * 1e4)}`
      const tk = `${Math.round(edge.to.x * 1e4)}_${Math.round(edge.to.y * 1e4)}`
      const key =
        portKey.get(pointToSourcePort.get(fk) ?? "") ||
        portKey.get(pointToSourcePort.get(tk) ?? "")
      if (key) {
        result.set(elm.schematic_trace_id, key)
        break
      }
    }
  }

  return result
}
