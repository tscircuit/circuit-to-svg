import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const board = {
  type: "pcb_board" as const,
  pcb_board_id: "board",
  width: 30,
  height: 20,
  center: { x: 0, y: 0 },
  num_layers: 2,
  material: "fr4" as const,
  thickness: 1.6,
}

const pcbGroup = {
  type: "pcb_group" as const,
  pcb_group_id: "group_1",
  source_group_id: "source_group_1",
  width: 10,
  height: 8,
  center: { x: 5, y: 3 },
  pcb_component_ids: ["comp_1", "comp_2"],
  name: "Test Group",
}

test("pcb_group renders with dashed border when showPcbGroups is true", () => {
  const svg = convertCircuitJsonToPcbSvg([board, pcbGroup], {
    showPcbGroups: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
