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

const pcbGroupWithOutline = {
  type: "pcb_group" as const,
  pcb_group_id: "group_outline",
  source_group_id: "source_group_outline",
  pcb_component_ids: [],
  name: "Outline Group",
  outline: [
    { x: -4, y: -2 },
    { x: 4, y: -4 },
    { x: 4, y: 4 },
    { x: -4, y: 4 },
  ],
  center: { x: 5, y: 2.5 },
  width: 10,
  height: 5,
}

test("pcb_group renders with dashed border when showPcbGroups is true", () => {
  const svg = convertCircuitJsonToPcbSvg([board, pcbGroup], {
    showPcbGroups: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("pcb_group renders outline path when outline is provided", () => {
  const svg = convertCircuitJsonToPcbSvg([board, pcbGroupWithOutline], {
    showPcbGroups: true,
  })

  expect(svg).toContain('data-pcb-group-id="group_outline"')
  expect(svg).toMatch(/<path[^>]+class="pcb-group"/)
  expect(svg).not.toMatch(/<rect[^>]+data-pcb-group-id="group_outline"/)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "outline")
})
