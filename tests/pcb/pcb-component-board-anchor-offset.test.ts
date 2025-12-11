import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb_component with positioned_relative_to_pcb_board_id shows anchor offsets", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 40,
      height: 30,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    // Component positioned relative to board (requires position_mode)
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      source_component_id: "source_1",
      center: { x: 8, y: 5 },
      width: 4,
      height: 3,
      layer: "top",
      rotation: 0,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_board_id: "board_1",
      display_offset_x: "8mm",
      display_offset_y: "5mm",
    },
    // Component positioned relative to board with different offset
    {
      type: "pcb_component",
      pcb_component_id: "comp_2",
      source_component_id: "source_2",
      center: { x: -6, y: -4 },
      width: 3,
      height: 2.5,
      layer: "top",
      rotation: 0,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_board_id: "board_1",
      display_offset_x: "-6mm",
      display_offset_y: "-4mm",
    },
    // Component with absolute positioning (should NOT show anchor offsets)
    {
      type: "pcb_component",
      pcb_component_id: "comp_3",
      source_component_id: "source_3",
      center: { x: 15, y: 12 },
      width: 5,
      height: 4,
      layer: "top",
      rotation: 0,
      // No positioned_relative_to_pcb_board_id or positioned_relative_to_pcb_group_id
    },
  ] as any

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showAnchorOffsets: true,
    colorOverrides: {
      debugComponent: {
        fill: "rgba(255, 0, 0, 0.1)",
        stroke: "red",
      },
    },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "board-only")
})

test("pcb_component with both group and board positioning shows correct anchor offsets", () => {
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
    // Create a PCB group
    {
      type: "pcb_group",
      pcb_group_id: "group_1",
      source_group_id: "source_group_1",
      name: "Group 1",
      center: { x: -10, y: 10 },
      width: 15,
      height: 12,
      pcb_component_ids: ["comp_1"],
    },
    // Component positioned relative to group
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
      display_offset_x: "2mm",
      display_offset_y: "2mm",
    },
    // Component positioned relative to board
    {
      type: "pcb_component",
      pcb_component_id: "comp_2",
      source_component_id: "source_2",
      center: { x: 10, y: -8 },
      width: 5,
      height: 4,
      layer: "top",
      rotation: 0,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_board_id: "board_1",
      display_offset_x: "10mm",
      display_offset_y: "-8mm",
    },
  ] as any

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

  expect(svg).toMatchSvgSnapshot(import.meta.path, "group-and-board")
})
