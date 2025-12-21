import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb_component with positioned_relative_to_pcb_group_id", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 60,
      height: 40,
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
      center: { x: 0, y: 0 },
      width: 18,
      height: 15,
      pcb_component_ids: ["comp_1", "comp_2"],
    },
    // Component positioned relative to group
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      source_component_id: "source_1",
      center: { x: -5, y: 3 }, // Absolute position (top-left of center)
      width: 5,
      height: 4,
      layer: "top",
      rotation: 0,
      positioned_relative_to_pcb_group_id: "group_1",
      position_mode: "relative_to_group_anchor",
    },
    // Another component in the same group
    {
      type: "pcb_component",
      pcb_component_id: "comp_2",
      source_component_id: "source_2",
      center: { x: 3, y: -2 }, // Absolute position (bottom-right of center)
      width: 4,
      height: 3,
      layer: "top",
      rotation: 0,
      positioned_relative_to_pcb_group_id: "group_1",
      position_mode: "relative_to_group_anchor",
    },
    // Component with absolute positioning (for comparison)
    {
      type: "pcb_component",
      pcb_component_id: "comp_3",
      source_component_id: "source_3",
      center: { x: 15, y: 10 },
      width: 6,
      height: 5,
      layer: "top",
      rotation: 0,
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
