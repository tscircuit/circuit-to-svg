import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic inverter bubble", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "src_comp_1",
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "source_port",
      source_port_id: "src_port_1",
      name: "EN1",
      source_component_id: "src_comp_1",
    },
    {
      type: "source_port",
      source_port_id: "src_port_2",
      name: "EN2",
      source_component_id: "src_comp_1",
    },
    {
      type: "source_port",
      source_port_id: "src_port_3",
      name: "EN3",
      source_component_id: "src_comp_1",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_comp_1",
      source_component_id: "src_comp_1",
      center: { x: 0, y: 0 },
      size: { width: 1.6, height: 0.8 },
      is_box_with_pins: true,
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_port_3",
      schematic_component_id: "sch_comp_1",
      source_port_id: "src_port_3",
      center: { x: -1.2, y: 0 },
      side_of_component: "left",
      display_pin_label: "N_EN3",
      is_drawn_with_inversion_circle: true,
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_port_1",
      schematic_component_id: "sch_comp_1",
      source_port_id: "src_port_1",
      center: { x: 1.2, y: 0.2 },
      side_of_component: "right",
      display_pin_label: "N_EN1",
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_port_2",
      schematic_component_id: "sch_comp_1",
      source_port_id: "src_port_2",
      center: { x: 1.2, y: -0.2 },
      side_of_component: "right",
      display_pin_label: "EN2",
      is_drawn_with_inversion_circle: true,
    },
  ]

  expect(
    // @ts-ignore
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
