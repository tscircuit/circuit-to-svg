import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

// Verifies that unresolved symbol placeholders (e.g. {VAL} with no display value)
// are omitted instead of rendering empty <text> elements. The boxresistor_right
// symbol defines {REF} and {VAL} text primitives; without symbol_display_value
// the {VAL} placeholder resolves to "".
test.failing(
  "should not emit empty text elements for unresolved {VAL} in symbol",
  () => {
    const circuitJson: AnyCircuitElement[] = [
      {
        type: "source_component",
        source_component_id: "source_component_r1",
        name: "R1",
        ftype: "simple_resistor",
        resistance: 10,
      },
      {
        type: "source_port",
        source_port_id: "source_port_r1_p1",
        name: "left",
        source_component_id: "source_component_r1",
      },
      {
        type: "source_port",
        source_port_id: "source_port_r1_p2",
        name: "right",
        source_component_id: "source_component_r1",
      },
      {
        type: "schematic_component",
        schematic_component_id: "schematic_component_r1",
        source_component_id: "source_component_r1",
        center: { x: 0, y: 0 },
        size: { width: 1.18, height: 1.3 },
        is_box_with_pins: true,
        symbol_name: "boxresistor_right",
      },
      {
        type: "schematic_port",
        schematic_port_id: "schematic_port_r1_p1",
        source_port_id: "source_port_r1_p1",
        center: { x: -0.5, y: 0 },
        facing_direction: "left",
        schematic_component_id: "schematic_component_r1",
      },
      {
        type: "schematic_port",
        schematic_port_id: "schematic_port_r1_p2",
        source_port_id: "source_port_r1_p2",
        center: { x: 0.5, y: 0 },
        facing_direction: "right",
        schematic_component_id: "schematic_component_r1",
      },
    ]

    const svg = convertCircuitJsonToSchematicSvg(circuitJson)

    expect(svg).toContain("R1")
    expect(svg).not.toMatch(/<text[^>]*><\/text>/)
    expect(svg).toMatchSvgSnapshot(import.meta.path)
  },
)
