import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb_component with group anchor_position and anchor_alignment shows correct anchor offsets", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 60,
      height: 50,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    // Create a PCB group with explicit anchor_position
    {
      type: "pcb_group",
      pcb_group_id: "group_1",
      source_group_id: "source_group_1",
      name: "Group with anchor_position",
      center: { x: -10, y: 10 },
      width: 15,
      height: 12,
      anchor_position: { x: -12, y: 8 },
      pcb_component_ids: ["comp_1"],
    },
    // Component positioned relative to group with anchor_position
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      source_component_id: "source_1",
      center: { x: -8, y: 12 },
      width: 4,
      height: 3,
      layer: "top",
      rotation: 0,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_group_id: "group_1",
      display_offset_x: "4mm",
      display_offset_y: "4mm",
    },
    // Create a PCB group with anchor_alignment
    {
      type: "pcb_group",
      pcb_group_id: "group_2",
      source_group_id: "source_group_2",
      name: "Group with anchor_alignment",
      center: { x: 10, y: -10 },
      width: 20,
      height: 16,
      anchor_alignment: "top_left",
      pcb_component_ids: ["comp_2"],
    },
    // Component positioned relative to group with anchor_alignment
    {
      type: "pcb_component",
      pcb_component_id: "comp_2",
      source_component_id: "source_2",
      center: { x: 12, y: -8 },
      width: 5,
      height: 4,
      layer: "top",
      rotation: 0,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_group_id: "group_2",
      display_offset_x: "2mm",
      display_offset_y: "2mm",
    },
    // Create a PCB group with bottom_right anchor_alignment
    {
      type: "pcb_group",
      pcb_group_id: "group_3",
      source_group_id: "source_group_3",
      name: "Group with bottom_right anchor",
      center: { x: -15, y: -15 },
      width: 10,
      height: 8,
      anchor_alignment: "bottom_right",
      pcb_component_ids: ["comp_3"],
    },
    // Component positioned relative to group with bottom_right anchor
    {
      type: "pcb_component",
      pcb_component_id: "comp_3",
      source_component_id: "source_3",
      center: { x: -13, y: -17 },
      width: 3,
      height: 2.5,
      layer: "top",
      rotation: 0,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_group_id: "group_3",
      display_offset_x: "2mm",
      display_offset_y: "-2mm",
    },
  ] as AnyCircuitElement[]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showPcbGroups: true,
    showAnchorOffsets: true,
    colorOverrides: {
      debugComponent: {
        fill: "rgba(255, 0, 0, 0.1)",
        stroke: "red",
      },
    },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

