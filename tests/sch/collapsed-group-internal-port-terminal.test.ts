import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("collapsed group public ports use schematic connection state", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_port",
      source_port_id: "public_port",
      name: "ROW1",
    },
    {
      type: "source_component",
      source_component_id: "internal_led",
      name: "D1",
      ftype: "simple_led",
    },
    {
      type: "source_port",
      source_port_id: "internal_port",
      name: "anode",
      source_component_id: "internal_led",
    },
    {
      type: "source_trace",
      source_trace_id: "internal_trace",
      connected_source_port_ids: ["public_port", "internal_port"],
      connected_source_net_ids: [],
    },
    {
      type: "schematic_component",
      schematic_component_id: "collapsed_group",
      source_component_id: "source_group_0",
      center: { x: 0, y: 0 },
      size: { width: 2.8, height: 0.8 },
      is_box_with_pins: true,
    },
    {
      type: "schematic_port",
      schematic_port_id: "public_schematic_port",
      schematic_component_id: "collapsed_group",
      source_port_id: "public_port",
      center: { x: -1.8, y: 0 },
      facing_direction: "left",
      side_of_component: "left",
      distance_from_component_edge: 0.4,
      display_pin_label: "ROW1",
      is_connected: false,
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  expect(svg.match(/sch-port-terminal/g) ?? []).toHaveLength(0)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
