import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb_component with positioned_relative_to_pcb_group_id shows anchor offsets", () => {
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
    // The parent group
    {
      type: "pcb_group",
      pcb_group_id: "group_1",
      source_group_id: "source_group_1",
      name: "Parent Group",
      center: { x: -5, y: 5 },
      width: 20,
      height: 20,
      pcb_component_ids: ["comp_1"],
    },
    // Component positioned relative to the group
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      center: { x: 5, y: -5 },
      width: 8,
      height: 6,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_group_id: "group_1",
      display_offset_x: "10mm",
      display_offset_y: -10,
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
