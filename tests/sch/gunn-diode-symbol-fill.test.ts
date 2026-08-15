import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/sch/convert-circuit-json-to-schematic-svg"
import type { AnyCircuitElement } from "circuit-json"

test("schematic symbols with filled paths preserve path fill (#418)", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "diode1",
      name: "D1",
      ftype: "simple_diode",
    },
    {
      type: "source_port",
      source_port_id: "port_1",
      source_component_id: "diode1",
      name: "1",
      pin_number: 1,
    },
    {
      type: "source_port",
      source_port_id: "port_2",
      source_component_id: "diode1",
      name: "2",
      pin_number: 2,
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_diode1",
      source_component_id: "diode1",
      center: { x: 0, y: 0 },
      size: { width: 1.2, height: 0.8 },
      symbol_name: "gunn_diode_horz",
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_port_1",
      source_port_id: "port_1",
      schematic_component_id: "sch_diode1",
      center: { x: -0.52, y: 0 },
      facing_direction: "left",
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_port_2",
      source_port_id: "port_2",
      schematic_component_id: "sch_diode1",
      center: { x: 0.52, y: 0 },
      facing_direction: "right",
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  // Verify that paths with fill: true have a color fill rather than all fill="none"
  expect(svg).toMatch(/class="sch-component-symbol-path"[^>]*fill="(?!none)[^"]+"/)
})
