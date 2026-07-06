import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "source_trace",
    source_trace_id: "source_trace_0",
    connected_source_port_ids: [],
    connected_source_net_ids: [],
    subcircuit_connectivity_map_key: "unnamedsubcircuit0_connectivity_net5",
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_1",
    connected_source_port_ids: [],
    connected_source_net_ids: [],
    subcircuit_connectivity_map_key: "unnamedsubcircuit0_connectivity_net5",
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_0",
    source_trace_id: "source_trace_0",
    edges: [{ from: { x: 0, y: 0 }, to: { x: 2, y: 0 } }],
    junctions: [],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_1",
    source_trace_id: "source_trace_1",
    edges: [{ from: { x: 0, y: 1 }, to: { x: 2, y: 1 } }],
    junctions: [],
  },
] as AnyCircuitElement[]

// schematic_trace elements usually only reference their source_trace and don't
// carry subcircuit_connectivity_map_key themselves. Net hover styles target
// [data-subcircuit-connectivity-map-key], so the key must be resolved from the
// source_trace or hovering a trace won't highlight the rest of its net.
// https://github.com/tscircuit/tscircuit/issues/1130
test("net hover connectivity key falls back to source_trace", () => {
  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  // element attributes (not the [data-...] CSS selectors in the style block)
  const attrMatches = svg.match(
    /[^[]data-subcircuit-connectivity-map-key="unnamedsubcircuit0_connectivity_net5"/g,
  )
  // base + overlay group for each of the 2 traces
  expect(attrMatches?.length).toBe(4)

  // net hover CSS rules are emitted for the shared key
  expect(svg).toContain(
    'svg:has(:is(g.trace[data-subcircuit-connectivity-map-key="unnamedsubcircuit0_connectivity_net5"]',
  )

  // no bogus rules for traces without any resolvable key
  expect(svg).not.toContain('data-subcircuit-connectivity-map-key="undefined"')
})
