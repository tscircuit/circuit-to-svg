import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb_group with positioned_relative_to_pcb_group_id", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 80,
      height: 60,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    // Parent group
    {
      type: "pcb_group",
      pcb_group_id: "group_1",
      source_group_id: "source_group_1",
      name: "Parent Group",
      center: { x: -10, y: 5 },
      width: 20,
      height: 15,
      pcb_component_ids: [],
    },
    // Child group positioned relative to parent group
    {
      type: "pcb_group",
      pcb_group_id: "group_2",
      source_group_id: "source_group_2",
      name: "Child Group",
      center: { x: 15, y: -10 },
      width: 18,
      height: 12,
      pcb_component_ids: [],
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_group_id: "group_1",
      display_offset_x: "-10mm",
      display_offset_y: -15.5,
    },
  ] as AnyCircuitElement[]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showPcbGroups: true,
    showAnchorOffsets: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
