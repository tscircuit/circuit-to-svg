import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, SchematicNetLabel } from "circuit-json"

/**
 * Resolve the `subcircuit_connectivity_map_key` for a schematic net label so it
 * can share the same net-hover highlighting mechanism used by schematic traces.
 *
 * Net labels don't carry the connectivity key directly; the value is derived
 * from `source_net_id`, which appears in two forms:
 *
 * 1. Named-net labels (e.g. `<trace from="net.MYNET" .../>`) reference a real
 *    `source_net` element that carries the `subcircuit_connectivity_map_key`.
 * 2. Named-trace labels (e.g. `<trace name="R1_C1" .../>`) have no separate
 *    `source_net` element — their `source_net_id` already *is* the connectivity
 *    map key that the net's traces use.
 *
 * The trace's `subcircuit_connectivity_map_key` is identical in both cases, so
 * we prefer the `source_net` lookup and fall back to the raw `source_net_id`.
 */
export function getSchematicNetLabelConnectivityKey(
  schNetLabel: SchematicNetLabel,
  circuitJson: AnyCircuitElement[],
): string | undefined {
  const sourceNetId = schNetLabel.source_net_id
  if (!sourceNetId) return undefined
  const sourceNet = su(circuitJson).source_net.get(sourceNetId)
  return sourceNet?.subcircuit_connectivity_map_key ?? sourceNetId
}
