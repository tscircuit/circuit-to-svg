import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic sheet renders linked subcircuit centered on sheet", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_1",
      name: "Main Sheet",
      subcircuit_id: "subcircuit_a",
    },
    {
      type: "source_component",
      source_component_id: "source_component_r1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 40,
      subcircuit_id: "subcircuit_a",
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
      center: { x: 0, y: 3 },
      is_box_with_pins: true,
      size: { width: 1.18, height: 1.3 },
      symbol_name: "boxresistor_right",
      subcircuit_id: "subcircuit_a",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r1_p1",
      source_port_id: "source_port_r1_p1",
      center: { x: -0.5, y: 3 },
      facing_direction: "left",
      schematic_component_id: "schematic_component_r1",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r1_p2",
      source_port_id: "source_port_r1_p2",
      center: { x: 0.5, y: 3 },
      facing_direction: "right",
      schematic_component_id: "schematic_component_r1",
    },
    {
      type: "schematic_text",
      schematic_text_id: "schematic_text_1",
      schematic_component_id: "schematic_component_r1",
      text: "R1",
      position: { x: -0.3, y: 2.5 },
      anchor: "left",
      rotation: 0,
      font_size: 0.2,
      color: "#006464",
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    width: 1200,
    height: 800,
  })

  expect(
    svg.match(/data-schematic-component-id="schematic_component_r1"/g),
  ).toHaveLength(1)
  expect(svg).toContain("sch-component-symbol-path")
  expect(svg).not.toContain("Main Sheet")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
