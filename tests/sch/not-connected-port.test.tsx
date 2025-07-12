import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic not connected port", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "src_comp1",
      ftype: "simple_resistor",
      name: "R1",
      resistance: 1000,
      display_resistance: "1kΩ",
    },
    {
      type: "source_port",
      source_port_id: "sp1",
      name: "pin1",
      pin_number: 1,
      port_hints: ["pin1"],
      source_component_id: "src_comp1",
      subcircuit_id: "sub0",
    },
    {
      type: "source_port",
      source_port_id: "sp2",
      name: "pin2",
      pin_number: 2,
      port_hints: ["pin2"],
      source_component_id: "src_comp1",
      subcircuit_id: "sub0",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sc1",
      center: { x: 0, y: 0 },
      size: { width: 1, height: 0.4 },
      source_component_id: "src_comp1",
      symbol_name: "boxresistor_right",
      symbol_display_value: "1kΩ",
    },
    {
      type: "schematic_port",
      schematic_port_id: "scp1",
      schematic_component_id: "sc1",
      center: { x: -0.6, y: 0 },
      source_port_id: "sp1",
      facing_direction: "left",
      distance_from_component_edge: 0.1,
      pin_number: 1,
      is_connected: false,
    },
    {
      type: "schematic_port",
      schematic_port_id: "scp2",
      schematic_component_id: "sc1",
      center: { x: 0.6, y: 0 },
      source_port_id: "sp2",
      facing_direction: "right",
      distance_from_component_edge: 0.1,
      pin_number: 2,
    },
  ]

  expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
