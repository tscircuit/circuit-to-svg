import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import type { AnyCircuitElement } from "circuit-json"

test("schematic port arrows", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "source_component_1",
      name: "C1",
      ftype: "simple_chip",
    },
    {
      type: "source_port",
      source_port_id: "source_port_1",
      name: "p1",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_2",
      name: "p2",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_3",
      name: "p3",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_4",
      name: "p4",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_5",
      name: "p5",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_6",
      name: "p6",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_7",
      name: "p7",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_8",
      name: "p8",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_9",
      name: "p9",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_10",
      name: "p10",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_11",
      name: "p11",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_12",
      name: "p12",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_13",
      name: "p13",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_14",
      name: "p14",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_15",
      name: "p15",
      source_component_id: "source_component_1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_16",
      name: "p16",
      source_component_id: "source_component_1",
    },
    {
      type: "schematic_component",
      schematic_component_id: "component_1",
      source_component_id: "source_component_1",
      center: { x: 0, y: 0 },
      size: { width: 8, height: 8 },
    },
    {
      type: "schematic_box",
      schematic_component_id: "component_1",
      x: -4,
      y: -4,
      width: 8,
      height: 8,
      is_dashed: false,
    },
    // Left side ports
    // y: 3, none
    {
      type: "schematic_port",
      schematic_port_id: "port_1",
      schematic_component_id: "component_1",
      source_port_id: "source_port_1",
      center: { x: -4.4, y: 3 },
      side_of_component: "left",
    },
    // y: 1, Input
    {
      type: "schematic_port",
      schematic_port_id: "port_2",
      schematic_component_id: "component_1",
      source_port_id: "source_port_2",
      center: { x: -4.4, y: 1 },
      side_of_component: "left",
      has_input_arrow: true,
    },
    // y: -1, Output
    {
      type: "schematic_port",
      schematic_port_id: "port_3",
      schematic_component_id: "component_1",
      source_port_id: "source_port_3",
      center: { x: -4.4, y: -1 },
      side_of_component: "left",
      has_output_arrow: true,
    },
    // y: -3, Both
    {
      type: "schematic_port",
      schematic_port_id: "port_4",
      schematic_component_id: "component_1",
      source_port_id: "source_port_4",
      center: { x: -4.4, y: -3 },
      side_of_component: "left",
      has_input_arrow: true,
      has_output_arrow: true,
    },
    // Right side ports
    // y: 3, none
    {
      type: "schematic_port",
      schematic_port_id: "port_5",
      schematic_component_id: "component_1",
      source_port_id: "source_port_5",
      center: { x: 4.4, y: 3 },
      side_of_component: "right",
    },
    // y: 1, Input
    {
      type: "schematic_port",
      schematic_port_id: "port_6",
      schematic_component_id: "component_1",
      source_port_id: "source_port_6",
      center: { x: 4.4, y: 1 },
      side_of_component: "right",
      has_input_arrow: true,
    },
    // y: -1, Output
    {
      type: "schematic_port",
      schematic_port_id: "port_7",
      schematic_component_id: "component_1",
      source_port_id: "source_port_7",
      center: { x: 4.4, y: -1 },
      side_of_component: "right",
      has_output_arrow: true,
    },
    // y: -3, Both
    {
      type: "schematic_port",
      schematic_port_id: "port_8",
      schematic_component_id: "component_1",
      source_port_id: "source_port_8",
      center: { x: 4.4, y: -3 },
      side_of_component: "right",
      has_input_arrow: true,
      has_output_arrow: true,
    },
    // Top side ports
    // x: -3, none
    {
      type: "schematic_port",
      schematic_port_id: "port_9",
      schematic_component_id: "component_1",
      source_port_id: "source_port_9",
      center: { x: -3, y: 4.4 },
      side_of_component: "top",
    },
    // x: -1, Input
    {
      type: "schematic_port",
      schematic_port_id: "port_10",
      schematic_component_id: "component_1",
      source_port_id: "source_port_10",
      center: { x: -1, y: 4.4 },
      side_of_component: "top",
      has_input_arrow: true,
    },
    // x: 1, Output
    {
      type: "schematic_port",
      schematic_port_id: "port_11",
      schematic_component_id: "component_1",
      source_port_id: "source_port_11",
      center: { x: 1, y: 4.4 },
      side_of_component: "top",
      has_output_arrow: true,
    },
    // x: 3, Both
    {
      type: "schematic_port",
      schematic_port_id: "port_12",
      schematic_component_id: "component_1",
      source_port_id: "source_port_12",
      center: { x: 3, y: 4.4 },
      side_of_component: "top",
      has_input_arrow: true,
      has_output_arrow: true,
    },
    // Bottom side ports
    // x: -3, none
    {
      type: "schematic_port",
      schematic_port_id: "port_13",
      schematic_component_id: "component_1",
      source_port_id: "source_port_13",
      center: { x: -3, y: -4.4 },
      side_of_component: "bottom",
    },
    // x: -1, Input
    {
      type: "schematic_port",
      schematic_port_id: "port_14",
      schematic_component_id: "component_1",
      source_port_id: "source_port_14",
      center: { x: -1, y: -4.4 },
      side_of_component: "bottom",
      has_input_arrow: true,
    },
    // x: 1, Output
    {
      type: "schematic_port",
      schematic_port_id: "port_15",
      schematic_component_id: "component_1",
      source_port_id: "source_port_15",
      center: { x: 1, y: -4.4 },
      side_of_component: "bottom",
      has_output_arrow: true,
    },
    // x: 3, Both
    {
      type: "schematic_port",
      schematic_port_id: "port_16",
      schematic_component_id: "component_1",
      source_port_id: "source_port_16",
      center: { x: 3, y: -4.4 },
      side_of_component: "bottom",
      has_input_arrow: true,
      has_output_arrow: true,
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    grid: {
      cellSize: 1,
      labelCells: true,
    },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
