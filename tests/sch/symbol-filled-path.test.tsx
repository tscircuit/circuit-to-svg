import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic symbol filled paths are rendered with fill", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "src_comp_1",
      name: "D1",
      ftype: "simple_diode",
    },
    {
      type: "source_port",
      source_port_id: "src_port_1",
      name: "1",
      source_component_id: "src_comp_1",
    },
    {
      type: "source_port",
      source_port_id: "src_port_2",
      name: "2",
      source_component_id: "src_comp_1",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_comp_1",
      source_component_id: "src_comp_1",
      center: { x: 0, y: 0 },
      size: { width: 1.04, height: 0.31 },
      symbol_name: "gunn_diode_horz",
      is_box_with_pins: true,
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_port_1",
      schematic_component_id: "sch_comp_1",
      source_port_id: "src_port_1",
      center: { x: -0.6, y: 0 },
      side_of_component: "left",
      display_pin_label: "1",
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_port_2",
      schematic_component_id: "sch_comp_1",
      source_port_id: "src_port_2",
      center: { x: 0.6, y: 0 },
      side_of_component: "right",
      display_pin_label: "2",
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  // The gunn diode's two filled triangles must render filled (not stroke-only)
  const filledSymbolPaths = svg.match(
    /<path[^>]*sch-component-symbol-path[^>]*fill="(?!none)[^"]*"[^>]*>/g,
  )
  expect(filledSymbolPaths).not.toBeNull()
  expect(filledSymbolPaths!.length).toBeGreaterThanOrEqual(2)
  expect(
    filledSymbolPaths!.every((p) => p.includes('fill="rgb(132, 0, 0)"')),
  ).toBeTrue()

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
